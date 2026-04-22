ALTER TABLE purchases RENAME COLUMN stripe_checkout_session_id TO unipay_order_id;
ALTER TABLE purchases RENAME COLUMN stripe_payment_intent_id TO unipay_transaction_id;
