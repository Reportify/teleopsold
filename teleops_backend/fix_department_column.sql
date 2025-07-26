-- SQL Script to fix the department column issue in tenant_designations table
-- This converts the department field from CharField to ForeignKey

-- Step 1: Add the new department_id column
ALTER TABLE tenant_designations 
ADD COLUMN department_id BIGINT;

-- Step 2: Create foreign key constraint
ALTER TABLE tenant_designations 
ADD CONSTRAINT fk_tenant_designations_department 
FOREIGN KEY (department_id) REFERENCES tenant_departments(id) ON DELETE SET NULL;

-- Step 3: Migrate existing data (if any departments exist)
-- You'll need to run this manually for each tenant's data:
-- UPDATE tenant_designations 
-- SET department_id = (
--     SELECT id FROM tenant_departments 
--     WHERE tenant_departments.tenant_id = tenant_designations.tenant_id 
--     AND tenant_departments.department_name = tenant_designations.department
-- )
-- WHERE department IS NOT NULL AND department != '';

-- Step 4: Drop the old department column
ALTER TABLE tenant_designations 
DROP COLUMN department;

-- Step 5: Rename department_id to department (optional, to match Django expectations)
-- ALTER TABLE tenant_designations 
-- RENAME COLUMN department_id TO department; 