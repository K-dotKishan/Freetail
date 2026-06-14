# DATABASE_SCHEMA.md

See SCOPE.md for the full schema table.

## Entity Relationships

```
User ──┬── Membership ──── Group
       │                     │
       ├── Expense.paid_by   ├── Expense ──── ExpenseSplit ── User
       │                     │
       └── Settlement        └── ImportBatch ── ImportRow ─┬── Expense
                                                           └── Settlement
```

## Key Design Choices

### amount_inr (computed column)
Stored redundantly on Expense for fast balance queries.
Always = `amount × exchange_rate`, recomputed on every save.
This avoids doing currency math in every balance query.

### Membership.left_at
NULL means still active. Setting left_at marks departure without deleting the record.
Balance calculations exclude a member from expenses dated after their left_at.

### ImportRow.raw_data + parsed_data
Both stored as JSON. raw_data = exactly what was in the CSV. parsed_data = what the system decided to do with it.
This is the audit trail that satisfies Meera's "I want to approve anything the app deletes or changes."

### Soft delete (is_deleted)
Expenses are never hard-deleted. is_deleted=True marks them as removed.
They remain visible in audit history and can be reviewed.
