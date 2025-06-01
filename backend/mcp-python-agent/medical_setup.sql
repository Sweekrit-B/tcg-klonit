-- Create medical schema tables
CREATE TABLE IF NOT EXISTS physicians (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  specialty VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  available_hours JSON -- Store weekly availability
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  date_of_birth DATE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(id),
  physician_id INT REFERENCES physicians(id),
  appointment_date TIMESTAMP,
  reason TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample physician data with specialties
INSERT INTO physicians (name, specialty, phone, email, available_hours)
VALUES 
  ('Dr. Sarah Smith', 'Cardiology', '555-0101', 'smith.cardio@hospital.com',
   '{"monday": ["9:00", "10:00", "11:00", "14:00", "15:00"],
     "tuesday": ["9:00", "10:00", "11:00", "14:00", "15:00"],
     "wednesday": ["9:00", "10:00", "11:00", "14:00", "15:00"],
     "thursday": ["9:00", "10:00", "11:00", "14:00", "15:00"],
     "friday": ["9:00", "10:00", "11:00", "14:00", "15:00"]}'::JSON),
  ('Dr. Michael Smith', 'Pediatrics', '555-0102', 'smith.peds@hospital.com',
   '{"monday": ["9:30", "10:30", "11:30", "14:30", "15:30"],
     "tuesday": ["9:30", "10:30", "11:30", "14:30", "15:30"],
     "wednesday": ["9:30", "10:30", "11:30", "14:30", "15:30"],
     "thursday": ["9:30", "10:30", "11:30", "14:30", "15:30"],
     "friday": ["9:30", "10:30", "11:30", "14:30", "15:30"]}'::JSON),
  ('Dr. James Wilson', 'Orthopedics', '555-0103', 'wilson@hospital.com',
   '{"monday": ["8:00", "9:00", "10:00", "14:00", "15:00"],
     "tuesday": ["8:00", "9:00", "10:00", "14:00", "15:00"],
     "wednesday": ["8:00", "9:00", "10:00", "14:00", "15:00"],
     "thursday": ["8:00", "9:00", "10:00", "14:00", "15:00"],
     "friday": ["8:00", "9:00", "10:00", "14:00", "15:00"]}'::JSON),
  ('Dr. Emily Chen', 'Dermatology', '555-0104', 'chen@hospital.com',
   '{"monday": ["10:00", "11:00", "13:00", "14:00", "15:00"],
     "tuesday": ["10:00", "11:00", "13:00", "14:00", "15:00"],
     "wednesday": ["10:00", "11:00", "13:00", "14:00", "15:00"],
     "thursday": ["10:00", "11:00", "13:00", "14:00", "15:00"],
     "friday": ["10:00", "11:00", "13:00", "14:00", "15:00"]}'::JSON),
  ('Dr. Robert Smith', 'Neurology', '555-0105', 'smith.neuro@hospital.com',
   '{"monday": ["9:00", "10:00", "11:00", "13:00", "14:00"],
     "tuesday": ["9:00", "10:00", "11:00", "13:00", "14:00"],
     "wednesday": ["9:00", "10:00", "11:00", "13:00", "14:00"],
     "thursday": ["9:00", "10:00", "11:00", "13:00", "14:00"],
     "friday": ["9:00", "10:00", "11:00", "13:00", "14:00"]}'::JSON);

-- Insert some sample patients
INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, address)
VALUES 
  ('John', 'Doe', '1980-05-15', '555-1001', 'john.doe@email.com', '123 Oak St'),
  ('Jane', 'Smith', '1992-08-22', '555-1002', 'jane.smith@email.com', '456 Pine Ave'),
  ('Alice', 'Johnson', '1975-03-10', '555-1003', 'alice.j@email.com', '789 Maple Dr'),
  ('Bob', 'Williams', '1988-11-30', '555-1004', 'bob.w@email.com', '321 Cedar Ln'),
  ('Carol', 'Brown', '1995-07-18', '555-1005', 'carol.b@email.com', '654 Birch Rd');

-- Insert some sample appointments (including future dates)
INSERT INTO appointments (patient_id, physician_id, appointment_date, reason, status)
VALUES 
  (1, 1, CURRENT_DATE + INTERVAL '2 days' + INTERVAL '9 hours', 'Annual checkup', 'Scheduled'),
  (2, 1, CURRENT_DATE + INTERVAL '3 days' + INTERVAL '10 hours', 'Follow-up', 'Scheduled'),
  (3, 2, CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours', 'Consultation', 'Scheduled'),
  (4, 3, CURRENT_DATE + INTERVAL '4 days' + INTERVAL '11 hours', 'Initial visit', 'Scheduled'),
  (5, 4, CURRENT_DATE + INTERVAL '2 days' + INTERVAL '13 hours', 'Skin check', 'Scheduled'); 