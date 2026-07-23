# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
from datetime import timedelta

# Django imports
from django.core.management import BaseCommand
from django.utils import timezone

# Third party imports
from bs4 import BeautifulSoup

# Module imports
from plane.db.models import (
    FileAsset,
    Issue,
    Page,
    IssueComment,
    DraftIssue,
    IssueDescriptionVersion,
    PageVersion,
    Description,
    DescriptionVersion,
)
from plane.settings.storage import S3Storage
from plane.utils.exception_logger import log_exception

# The inline editor nodes whose `src` attribute holds a FileAsset id.
ASSET_TAGS = ("image-component", "video-component")

# Only description-family assets are eligible for GC. Attachments, avatars,
# logos and covers are managed explicitly elsewhere and are NEVER touched here.
DESCRIPTION_ENTITY_TYPES = [
    FileAsset.EntityTypeContext.ISSUE_DESCRIPTION,
    FileAsset.EntityTypeContext.PAGE_DESCRIPTION,
    FileAsset.EntityTypeContext.COMMENT_DESCRIPTION,
    FileAsset.EntityTypeContext.DRAFT_ISSUE_DESCRIPTION,
]

# (model, html_field) pairs scanned for asset references. CURRENT descriptions
# AND all version-history tables must be scanned, so an asset still referenced
# by a saved past version is never collected.
REFERENCE_SOURCES = [
    (Issue, "description_html"),
    (Page, "description_html"),
    (DraftIssue, "description_html"),
    (IssueComment, "comment_html"),
    (IssueDescriptionVersion, "description_html"),
    (PageVersion, "description_html"),
    (Description, "description_html"),
    (DescriptionVersion, "description_html"),
]


def _extract_src_ids(html):
    """Return the set of asset ids referenced by image/video nodes in html."""
    ids = set()
    if not html:
        return ids
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in ASSET_TAGS:
            for node in soup.find_all(tag):
                src = node.get("src")
                if src:
                    ids.add(src.strip())
    except Exception as e:
        log_exception(e)
    return ids


class Command(BaseCommand):
    help = (
        "Garbage-collect orphaned inline description assets (images + videos) that "
        "were removed from every current description AND every saved version. "
        "Dry-run by default; use --apply to soft-delete and --purge to hard-delete "
        "already-soft-deleted objects from object storage."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--grace-days",
            type=int,
            default=30,
            help="Only consider assets older than this many days as orphan candidates (default: 30).",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Soft-delete the orphan candidates (is_deleted=True). Reversible until purged.",
        )
        parser.add_argument(
            "--purge",
            action="store_true",
            help="Hard-delete from object storage assets already soft-deleted longer than --purge-grace-days.",
        )
        parser.add_argument(
            "--purge-grace-days",
            type=int,
            default=30,
            help="Only purge assets soft-deleted longer ago than this many days (default: 30).",
        )

    def _collect_referenced_ids(self):
        referenced = set()
        for model, field in REFERENCE_SOURCES:
            try:
                manager = getattr(model, "all_objects", model.objects)
                qs = manager.values_list(field, flat=True).iterator(chunk_size=1000)
                for html in qs:
                    referenced |= _extract_src_ids(html)
            except Exception as e:
                log_exception(e)
                # Fail safe: if a source can't be scanned, abort rather than
                # risk deleting assets we failed to see referenced.
                raise
        return referenced

    def handle(self, *args, **options):
        grace_days = options["grace_days"]
        do_apply = options["apply"]
        do_purge = options["purge"]
        purge_grace_days = options["purge_grace_days"]

        self.stdout.write(self.style.NOTICE("Scanning descriptions + version history for referenced assets..."))
        referenced_ids = self._collect_referenced_ids()
        self.stdout.write(f"  referenced inline asset ids: {len(referenced_ids)}")

        # ---- orphan candidates: uploaded description assets, old enough, unreferenced ----
        cutoff = timezone.now() - timedelta(days=grace_days)
        candidates_qs = FileAsset.objects.filter(
            entity_type__in=DESCRIPTION_ENTITY_TYPES,
            is_uploaded=True,
            is_deleted=False,
            created_at__lt=cutoff,
        )
        orphans = [a for a in candidates_qs.iterator(chunk_size=1000) if str(a.id) not in referenced_ids]
        orphan_bytes = sum((a.size or 0) for a in orphans)
        self.stdout.write(
            self.style.WARNING(
                f"  orphan candidates (>{grace_days}d, unreferenced): {len(orphans)} "
                f"(~{orphan_bytes / 1024 / 1024:.1f} MiB)"
            )
        )
        for a in orphans[:20]:
            self.stdout.write(f"    - {a.id}  {a.entity_type}  {a.attributes.get('name', '')}")
        if len(orphans) > 20:
            self.stdout.write(f"    ... and {len(orphans) - 20} more")

        if do_apply and orphans:
            now = timezone.now()
            ids = [a.id for a in orphans]
            for i in range(0, len(ids), 500):
                FileAsset.objects.filter(id__in=ids[i : i + 500]).update(is_deleted=True, deleted_at=now)
            self.stdout.write(self.style.SUCCESS(f"  soft-deleted {len(ids)} orphan assets (reversible until purged)."))
        elif orphans:
            self.stdout.write(self.style.NOTICE("  dry-run: pass --apply to soft-delete the above."))

        # ---- purge: hard-delete storage for assets soft-deleted long enough ago ----
        if do_purge:
            purge_cutoff = timezone.now() - timedelta(days=purge_grace_days)
            all_objects = getattr(FileAsset, "all_objects", FileAsset.objects)
            purgeable = list(
                all_objects.filter(
                    entity_type__in=DESCRIPTION_ENTITY_TYPES,
                    is_deleted=True,
                    deleted_at__lt=purge_cutoff,
                )
            )
            # Re-guard: never purge anything that is (still) referenced.
            purgeable = [a for a in purgeable if str(a.id) not in referenced_ids]
            self.stdout.write(
                self.style.WARNING(f"  purgeable (soft-deleted >{purge_grace_days}d): {len(purgeable)}")
            )
            if purgeable:
                storage = S3Storage()
                keys = [a.asset for a in purgeable if a.asset]
                for i in range(0, len(keys), 500):
                    storage.delete_files(keys[i : i + 500])
                ids = [a.id for a in purgeable]
                for i in range(0, len(ids), 500):
                    all_objects.filter(id__in=ids[i : i + 500]).delete()
                self.stdout.write(
                    self.style.SUCCESS(f"  purged {len(keys)} objects from storage + removed {len(ids)} rows.")
                )

        self.stdout.write(self.style.SUCCESS("gc_orphan_description_assets: done."))
