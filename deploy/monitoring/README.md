# S6-05 monitoring and log-policy templates

These files are provider-neutral local templates. They contain no account, DSN, token, recipient, host identity or external endpoint and perform no external action.

`journald-cwt.conf` is the one host logging policy for system and Docker `journald` output. On a separately authorized Linux host, install it as `/etc/systemd/journald.conf.d/60-cwt-bounds.conf`, verify the parsed settings, then restart `systemd-journald` inside the approved maintenance window. The persistent journal is capped at 4 GiB and 14 days; compression, sealing and one-day segment rotation remain enabled. Do not enable payload/error dumping or a parallel JSON-file logging path.

`monitoring-policy.v1.json` records the provider-neutral health, work and host thresholds. External account configuration and actual alert delivery remain future protected evidence. Critical alerts require an independent non-SMTP channel; Zoho/SMTP may never be the only path.

The application work-health one-shot exits `0` when healthy, `2` for an observed backlog/failure/dead/missing-or-stale-backup state and `1` when the probe itself is unavailable. It emits only fixed states and aggregate counts. Never add row identifiers, paths, payloads, raw errors or secret-derived data.
