# ❌ Denylisted Commands

The denylist feature serves as a robust security mechanism, regulating the execution of gcloud commands by the AI agent. This static denylist proactively prevents unintended or unauthorized operations by explicitly prohibiting specific commands and/or command groups. Should a particular command or command group be present in the denylist, all associated operations will be blocked.

**It is important to note that the denylist is not configurable by the user.**

The following commands/groups have been identified as unsuitable for execution by any agent:

```json
default_denylist = [
    "compute start-iap-tunnel",
    "compute connect-to-serial-port",
    "compute tpus tpu-vm ssh",
    "compute tpus queued-resources ssh",
    "compute ssh",
    "cloud-shell ssh",
    "workstations ssh",
    "app instances ssh"
]
```
