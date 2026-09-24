from app.models.governance import Policy, PolicyType

DEFAULT_POLICIES = [
    Policy(
        name="voice-recording-consent",
        policy_type=PolicyType.consent,
        resource_type="voice",
        rules={"requires_consent": True, "default": "deny"},
    ),
    Policy(
        name="vision-capture-consent",
        policy_type=PolicyType.consent,
        resource_type="vision",
        rules={"requires_consent": True, "default": "deny", "camera_enabled": False},
    ),
    Policy(
        name="cloud-model-data-consent",
        policy_type=PolicyType.consent,
        resource_type="model",
        rules={"requires_consent": True, "cloud_only": True},
    ),
    Policy(
        name="agent-action-audit",
        policy_type=PolicyType.audit,
        resource_type="agent",
        rules={"log_all_actions": True, "retention_days": 90},
    ),
    Policy(
        name="data-retention-default",
        policy_type=PolicyType.retention,
        resource_type="*",
        rules={"default_retention_days": None, "auto_purge": False},
    ),
]
