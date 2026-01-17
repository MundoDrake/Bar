-- Migration: Add register_stock_movement function
-- This function registers stock movements and updates stock levels atomically

-- Register stock movement and update stock levels atomically
CREATE OR REPLACE FUNCTION register_stock_movement(
    p_product_id UUID,
    p_type movement_type,
    p_quantity DECIMAL,
    p_reason VARCHAR DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_quantity_delta DECIMAL;
BEGIN
    -- Calculate the quantity change based on movement type
    CASE p_type
        WHEN 'entrada' THEN
            v_quantity_delta := p_quantity;
        WHEN 'saida' THEN
            v_quantity_delta := -p_quantity;
        WHEN 'perda' THEN
            v_quantity_delta := -p_quantity;
        WHEN 'ajuste' THEN
            -- For adjustments, the quantity can be positive or negative
            v_quantity_delta := p_quantity;
        ELSE
            RAISE EXCEPTION 'Invalid movement type: %', p_type;
    END CASE;

    -- Insert the movement record
    INSERT INTO stock_movements (product_id, type, quantity, reason, expiry_date, notes)
    VALUES (p_product_id, p_type, p_quantity, p_reason, p_expiry_date, p_notes);

    -- Update the stock level atomically
    UPDATE stock
    SET
        quantity = quantity + v_quantity_delta,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    -- If no stock record exists, create one
    IF NOT FOUND THEN
        INSERT INTO stock (product_id, quantity)
        VALUES (p_product_id, GREATEST(v_quantity_delta, 0));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
