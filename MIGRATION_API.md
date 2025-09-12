# Serial Number Migration API

This API provides endpoints to migrate `serial_no` fields from strings to numbers and check the current status of serial numbers in the database.

## Endpoints

### 1. Migrate Serial Numbers

**POST** `/api/migration/migrate-serial-numbers`

Converts all `serial_no` fields from strings to numbers in the orders collection.

**Response:**
```json
{
  "success": true,
  "message": "Successfully migrated X orders",
  "migrated": 5,
  "total_found": 5,
  "verification": {
    "top_orders": [
      {
        "serial_no": 1054,
        "type": "number"
      }
    ]
  }
}
```

**Usage:**
```bash
curl -X POST http://your-domain/api/migration/migrate-serial-numbers
```

### 2. Check Serial Numbers Status

**GET** `/api/migration/serial-numbers-status`

Returns the current status of serial numbers in the database.

**Response:**
```json
{
  "success": true,
  "status": {
    "total_orders": 55,
    "string_serial_count": 0,
    "number_serial_count": 55,
    "max_serial_no": 1054,
    "max_serial_type": "number",
    "counter": {
      "_id": "order_serial",
      "sequence_value": 1055
    },
    "migration_needed": false
  }
}
```

**Usage:**
```bash
curl -X GET http://your-domain/api/migration/serial-numbers-status
```

## Production Usage

1. **Check Status First:**
   ```bash
   curl -X GET https://your-production-domain/api/migration/serial-numbers-status
   ```

2. **Run Migration if Needed:**
   ```bash
   curl -X POST https://your-production-domain/api/migration/migrate-serial-numbers
   ```

3. **Verify Results:**
   ```bash
   curl -X GET https://your-production-domain/api/migration/serial-numbers-status
   ```

## Notes

- The migration is safe to run multiple times
- It only converts valid numeric strings to numbers
- Invalid serial numbers are skipped and logged
- The API provides detailed verification information
- No data is lost during the migration process