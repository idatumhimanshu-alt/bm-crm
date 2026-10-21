-- Seed Users
-- Update emails to match your Cloudflare Access policy
INSERT OR IGNORE INTO user (id, email, name, role) VALUES
  ('u-001', 'himanshu@soiltostructure.com', 'Himanshu Joshi', 'super_admin'),
  ('u-002', 'aditya@soiltostructure.com', 'Aditya', 'sales'),
  ('u-003', 'executive@soiltostructure.com', 'Executive', 'executive');
