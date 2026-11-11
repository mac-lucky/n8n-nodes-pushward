# n8n-nodes-pushward

Send [PushWard](https://pushward.app) notifications from n8n, drive Live Activities and widgets on the phone, and start a workflow when someone answers. You need a PushWard account and the app on a device.

## Install

In n8n open Settings > Community Nodes, choose Install and enter `n8n-nodes-pushward`. Self-hosted setups can also follow [n8n's install guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Resources and operations

The package adds two nodes, PushWard and PushWard Trigger.

- Notification: Send, Get Answer, Get Receipt, Cancel Receipt, Cancel Receipts by Tag, Retract
- Scheduled Notification: Create, Get, Get Many, Cancel
- Live Activity: Start, Update, End, Get, Get Many, Delete
- Widget: Create or Replace, Update, Get, Get Many, Delete
- Email: Send, to a verified recipient of your account
- Account: Get

Start creates the activity when it doesn't exist yet and sets it ongoing. Pick a template and the fields follow it; Extra Content takes JSON for anything the form doesn't have.

Live Activity templates: Alert, Approval, Board, Checklist, Countdown, Gauge, Generic, Log, Media, Steps, Timeline. Widget templates: Battery, Countdown, Flow, Gauge, Heatmap, Progress, Schedule, Stat List, Status, Trend, Value.

A Checklist item's Checked starts on None, which leaves it out of the request: on Update the item keeps whatever was ticked on the phone, and a new item starts unchecked. Get returns the ticks, and once every item is ticked PushWard ends the activity. Heatmap Cells takes one number per day, oldest first; an empty entry or `null` is a day with no data, but a comma after the last value is dropped rather than read as today.

Update starts on Keep Current, which leaves the template alone. To change fields, pick the template the item already uses. Picking a different one switches the layout, and a Live Activity then loses the tiles, log lines or history the old one held.

Create or Replace stores a widget but doesn't tell devices to reload it. For anything on a schedule use Update, which does.

A widget's look is Style under Content Fields: Standard is the default, Bold lays out the same data differently and Classic is the earlier design. Every template has all three. A style set here overrides the one picked for that widget in the PushWard app, so leave it out if the person with the phone should choose; with neither set the widget is Standard. Create or Replace sends the whole content, so running it without Style drops a style set earlier. Update without Style keeps it, and Extra Content `{"style": null}` clears it.

Style by Size picks the look for one size and wins over Style there. Small, Medium and Large are the Home Screen sizes and Lock Screen is every Lock Screen size; Android has no Lock Screen widgets and ignores it. Stat List also has Row Density (auto, compact or comfortable) and Row Density by Size, which override the app's Row Density the same way. Update replaces the whole by-size list stored before, so add every size you want to keep. While a density is stored, Update can't move the widget to another template unless the same run clears it with Extra Content `{"density": null, "density_by_size": null}`.

A Style saved with 0.3.0 keeps working: the node sends it under its new name. The editor marks the old value as not supported until you pick a style again.

## Send options

Send and scheduled Create share these. Title (up to 256 characters) and Body (up to 4096) are required. The API refuses a longer value and the node does not shorten it for you; encrypted sends differ, see Encryption. A field you added but left blank is not sent, and neither is an expression that comes out empty. Every notification carries `source` and `source_display_name` set to `n8n`, which is the sender name you see in the app.

Action Buttons puts up to 10 buttons on the notification. Each needs an ID and a Title. A button with a URL opens or calls it. A button without one that doesn't open the app has PushWard record the tap, and with Text Input on it asks for a typed reply. Read those with Get Answer or the Trigger.

Acknowledge repeats the notification until someone taps it. Repeat Seconds and Expire Seconds set the pace, Tags feed Cancel Receipts by Tag, and Callback URL gets a signed POST once it is acknowledged or expires. It can't be combined with Send Push off, the passive level or Snooze.

Under Additional Fields:

- Collapse ID: a later notification with the same ID replaces this one on the devices (64 characters).
- Level: passive, active, time-sensitive or critical. Leave it out and PushWard uses active. Critical sounds through mute and Focus, so the node never picks it on its own. Critical Volume sets how loud.
- Encrypt: see below.
- Idempotency Key: see Retry On Fail.
- Media attaches an image, video or audio file by URL. Icon URL sets the sender avatar. Metadata stores key and value pairs with the notification.
- Organization Target narrows who receives it, for organization keys.
- Send Push: turn it off to keep the notification in the inbox only.
- Snooze: comma-separated minutes offered as snooze choices.
- Subtitle (256 characters), Thread ID (groups notifications, 128 characters), URL (opens when the notification is tapped).

### Encryption

Put a key in the credential's Encryption Key field and Send and scheduled Create seal the title, subtitle, body and URL on the n8n machine (AES-256-GCM, format `pw1`). PushWard stores and forwards only the sealed text. Create the key in the app under Settings > End-to-End Encryption (1.17 or later) and copy the 64 hex characters. Devices on older builds show a placeholder.

Level, buttons, metadata and everything else stay readable, so don't put secrets in button labels. A typed reply isn't sealed either: PushWard stores it as plain text for 30 days. Live Activities, widgets and emails are never sealed.

Set Encrypt to off under Additional Fields to send one notification in the clear. A key that isn't 64 hex characters stops the item with an error and nothing is sent; the node never falls back to plain text. The sealed text holds about 2.2 KB. Past that the API refuses the send. It can't read sealed fields, so it can't refuse a title or subtitle over 256 characters or a malformed URL: the app cuts the title and subtitle to 256 when it opens the notification, and drops a URL it can't use.

With an organization key, every member's device needs the organization's key, and a send gets 422 `notification.encryption_unavailable` if PushWard has encryption turned off for organizations.

## Trigger

PushWard Trigger polls `GET /notifications/answers` and outputs one item per answer, oldest first, so answers that arrive between two polls share one execution. Each item has `notification_id`, `action_id`, `text` for a typed reply, `answered_at`, and `collapse_id` and `thread_id` when the notification had them.

Only buttons without a URL and typed replies appear in the feed. A button with a URL opens or calls it and PushWard never hears about it. The Acknowledge button PushWard adds counts as a tap too and arrives with `action_id` `pw_ack`, so use Action IDs if the trigger shouldn't run for those.

The feed is per integration key: the trigger only sees answers to notifications sent with the same key, so use one credential for the Send node and the trigger.

Action IDs narrows it to some buttons, comma-separated. Everything else is skipped for good, not held back.

The first activation starts from that moment, so older answers are not replayed. After that the trigger keeps its position across a deactivation: answers given while the workflow was off (PushWard keeps them for 30 days) start it when it's turned back on. If a late answer shouldn't count, check `answered_at`.

A poll reads at most 20 pages of 100 and the next poll carries on from there. Fetch Test Event waits up to 25 seconds for a tap and doesn't move the position the active workflow reads from.

## Waiting for a person

There's no built-in Send and Wait. Two ways to get the same result:

The Trigger, as a separate workflow. It works from a homelab behind NAT, since n8n only makes outgoing calls. Answers carry the notification's Collapse ID and Thread ID, so set one if the second workflow needs to know which job the answer was for.

Callback URL with n8n's Wait node, when n8n is reachable from the internet over HTTPS. Set Acknowledge > Callback URL on the Send node to `{{ $execution.resumeUrl }}` and follow it with a Wait node on Resume: On Webhook Call, with HTTP Method changed to POST. It defaults to GET, and n8n won't resume on PushWard's call that way. The POST comes when the notification is acknowledged or expires. PushWard refuses private addresses, so a LAN-only n8n can't use this.

## Credentials

Create a PushWard API credential and paste an integration key, the one starting with `hlk_`. Encryption Key is optional, see above.

The app makes a default key when you sign in: it's under Settings > Integration Key, and it has every level below. To give n8n less than that, create one under Settings > Manage Keys with the levels you need. The key is shown once.

| Resource | Level on the key |
|---|---|
| Notification (and the Trigger) | `notifications`: `send` |
| Scheduled Notification | `notifications`: `schedule` |
| Live Activity | `activities`: `read` for Get and Get Many, `update` for Update and End, `manage` for Start and Delete |
| Widget | `widgets`: `read` for Get and Get Many, `write` for the rest |
| Email | `emails`: `send` |
| Account | any key |

n8n checks the credential with `GET /auth/me`, so saving it never sends a push. That endpoint accepts every key, which means a key without the right level still tests green and then gets a 403 when the node runs.

## Quota

Limits depend on the plan, so they aren't listed here. Account > Get returns them next to what you've used, for example `notifications_used` and `notifications_limit`. Past a limit the API answers 429 and the item fails.

## Retry On Fail

A retry after a timeout can send the same notification twice, because the first attempt may have landed. Set Idempotency Key on Send or scheduled Create and a repeat with the same key does not send again. Use something unique per send that stays the same across retries, like `{{ $execution.id }}-{{ $itemIndex }}`.

## Compatibility

Tested with n8n 2.46.6. Not tried on n8n 1.x.

Building from source needs Node.js 22 or newer.

## Usage

Approving a deploy from the lock screen, in two workflows that share one credential.

The first sends the question. Add a PushWard node:

- Title: `Deploy {{ $json.version }}?`
- Body: `{{ $json.summary }}`
- Action Buttons: one with ID `approve`, Title `Approve`, and one with ID `reject`, Title `Reject`, Destructive on
- Additional Fields > Collapse ID: `deploy-{{ $json.version }}`

The second starts with PushWard Trigger, Action IDs `approve, reject`, followed by an If node on `{{ $json.action_id }}` and whatever does the deploy. `{{ $json.collapse_id }}` tells you which version the answer was for.

To hear about a workflow that fails, build an error workflow from Error Trigger > PushWard and pick it under the failing workflow's settings:

- Title: `{{ $json.workflow.name }}`
- Body: `{{ $json.execution.error.message }}`
- Level: time-sensitive
- Collapse ID: `failed-{{ $json.workflow.id }}`, so a run that fails again replaces the first alert instead of stacking a second one

The output of Send is the notification the API created. More on levels and grouping in the [PushWard docs](https://pushward.app/docs/notifications).
