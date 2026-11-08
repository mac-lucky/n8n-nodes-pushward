# n8n-nodes-pushward

Send a [PushWard](https://pushward.app) notification from an n8n workflow. You need a PushWard account and the app on a phone.

## Install

In n8n open Settings > Community Nodes, choose Install and enter `n8n-nodes-pushward`. Self-hosted setups can also follow [n8n's install guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Operations

There is one: Notification > Send.

Title (up to 256 characters) and Body (up to 4096) are required. A longer value is refused by the API, the node does not shorten it for you.

Under Additional Fields:

- Collapse ID: a later notification with the same ID replaces this one on the devices (64 characters).
- Level: passive, active, time-sensitive or critical. Leave it out and PushWard uses active. Critical sounds through mute and Focus, so the node never picks it on its own.
- Subtitle (256 characters).
- Thread ID groups notifications (128 characters).
- URL opens when the notification is tapped.

A field you added but left blank is not sent, and neither is an expression that comes out empty. Every notification carries `source` and `source_display_name` set to `n8n`, which is the sender name you see in the app.

Acknowledgements, action buttons, media, encryption and a trigger node are not part of this package.

## Credentials

Create a PushWard API credential and paste an integration key, the one starting with `hlk_`.

The app makes a default key when you sign in: it's under Settings > Integration Key. To give n8n less than that, create one under Settings > Manage Keys with `notifications` at `send` (the Notifications only preset). The key is shown once.

n8n checks the credential with `GET /auth/me`, so saving it never sends a push. That endpoint accepts every key, which means a key without `notifications` access still tests green and then gets a 403 when the node sends.

## Compatibility

Tested with n8n 2.46.6. Not tried on n8n 1.x.

Building from source needs Node.js 22 or newer.

## Usage

Put the node after whatever notices the event. To hear about a workflow that fails, build an error workflow from Error Trigger > PushWard and pick it under the failing workflow's settings:

- Title: `{{ $json.workflow.name }}`
- Body: `{{ $json.execution.error.message }}`
- Level: time-sensitive
- Collapse ID: `failed-{{ $json.workflow.id }}`, so a run that fails again replaces the first alert instead of stacking a second one

The output is the notification the API created. More on levels and grouping in the [PushWard docs](https://pushward.app/docs/notifications).

Retry On Fail can deliver the same notification twice, since the node doesn't send an idempotency key. Set a Collapse ID if that would annoy you.
