# HoopTech fork changes

This file tracks HoopTech-specific patches on top of upstream Plane CE, kept
separately from upstream's own changelog. Reverse-chronological; each entry is
a short summary, not a full diff (see git history / linked commits for that).

All work lands on the `hooptech` branch (renamed from `feat/inline-video-v1`,
which undersold what's here — inline video was only the first patch).

## Shared work item links now show the work item ID, like MBH-1026, instead of a generic Plane description

## Work item templates: start new work items already filled in with your usual details, turned on per project

## Removed an unused build workflow left over from the old setup

## Removed another unused build workflow that kept failing

## Notifications page: added a back button to return to where you were

## New notifications now pop up on your desktop when Plane is in a background tab

## Fixed the cycle analytics chart never loading

## Fixed file uploads and downloads failing for outside integrations

`apps/api/plane/settings/storage.py` — `S3Storage.__init__()` only accepted
`request=None`, but `apps/api/plane/api/views/asset.py` (`UserServerAssetEndpoint`,
`GenericAssetEndpoint` GET+POST) all called it with `is_server=True`, an
argument that never existed. Every request to these endpoints — the ones a
service API token uses to create/download assets — 500'd unconditionally.
Never caught before because nothing had exercised the token-authenticated
asset path until an external integration hit it. Fixed by accepting
`is_server` (stored, currently unused beyond that — no behavior change from
the working `request=request` path every other call site already uses).

## Fixed the notifications list failing to load

`apps/web/core/services/workspace-notification.service.ts` — the notifications
list call was missing a trailing slash, causing a 500 on every fetch. Added it.

## Orphaned-asset garbage collection

`apps/api/plane/db/management/commands/gc_orphan_description_assets.py` — new
management command, version-history-aware (scans Issue/Page/DraftIssue/
IssueComment and their version tables). Dry-run by default; `--apply`
soft-deletes unreferenced description-family assets older than 30 days;
`--purge` hard-deletes soft-deleted assets older than a further 30 days, with
a re-guard against purging anything still referenced. Only ever touches
DESCRIPTION-family entity types (never attachments/avatars/logos/covers).

## Video duplication on entity copy

`apps/api/plane/bgtasks/copy_s3_object.py` — when an issue/page is duplicated,
both `image-component` and `video-component` assets in the description are now
copied (previously only images were).

## Video drag-handle fix

`packages/editor/src/core/plugins/drag-handle.ts` — added
`.video-component`/`.video-upload-component` to `generalSelectors` so the
editor's side-menu drag handle attaches to video nodes the same way it does
for images.

## Multipart upload (>100MB)

Cloudflare caps request bodies at 100MB; large video uploads need to be
chunked to get past it.

- Backend: `apps/api/plane/settings/storage.py` (create/presign-parts/complete/
  abort multipart methods), `apps/api/plane/app/views/asset/v2.py` (multipart
  threshold/part-size constants, multipart response shape, complete endpoints).
- Frontend: `apps/web/core/services/file.service.ts` +
  `file-upload.service.ts` (slices the File, PUTs parts, collects ETags, calls
  complete).

## Inline video support (the original patch)

Plane Commercial gates inline video preview behind a paid Pro license
(cryptographically, not locally unlockable) — this fork adds it natively to CE.

- Editor node: `packages/editor/src/core/extensions/custom-video/` — a
  self-contained `videoComponent` TipTap node modeled on CE's own
  `custom-image`, with upload, resize, alignment, download, and full-screen.
- API: video MIME types added to the editor-asset upload endpoints
  (`apps/api/plane/app/views/asset/v2.py`).
- Sanitizer: `apps/api/plane/utils/content_validator.py` — added
  `video-component` to the nh3 allowlist (tag + `src`/`width`/`height`/`status`
  attributes), otherwise the tag was stripped silently on save.
