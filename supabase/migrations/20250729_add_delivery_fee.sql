-- Add delivery_fee column to orders table if it doesn't exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 60;

-- Add comment to the column
COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee in PKR';