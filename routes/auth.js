const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
const { registrationSchema } = require('../validation/student');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new student and their guardian
 *     description: Creates a guardian record and then a student record in a single transaction.
 *     requestBody:
 *       description: All fields required for creating a new student and their guardian.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationInput'
 *     responses:
 *       '201':
 *         description: Student registered successfully. Returns the created student with guardian details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentWithGuardian'
 *       '400':
 *         description: Validation error or duplicate entry.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
  // 1. Validate the entire request body using the new registrationSchema
  const { error } = registrationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    // Student fields
    firstName, lastName, middleName, admissioNo, form, section,
    address, bloodgroup, genotype, religion, tribe, gender,
    dob, phone, studentImg, email, password,
    // Guardian fields
    guardianName, guardianPhone, guardianStatus, guardianEmail, guardianImg
  } = req.body;

  const client = await pool.connect();

  try {
    // 2. Start a database transaction
    await client.query('BEGIN');

    // 3. Insert the guardian first
    const guardianResult = await client.query(
      'INSERT INTO guardians (name, phone, status, email, img) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING RETURNING id',
      [guardianName, guardianPhone, guardianStatus, guardianEmail, guardianImg]
    );
    
    let guardianId;
    if (guardianResult.rows.length > 0) {
      guardianId = guardianResult.rows[0].id;
    } else {
      // If the guardian already exists, fetch their ID
      const existingGuardian = await client.query('SELECT id FROM guardians WHERE email = $1', [guardianEmail]);
      if (existingGuardian.rows.length === 0) {
          throw new Error('Failed to create or find guardian.');
      }
      guardianId = existingGuardian.rows[0].id;
    }

    // 4. Hash the student's password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert the student with the correct, quoted column names
    const studentResult = await client.query(
      `INSERT INTO students (
        "firstName", "lastName", "middleName", "admissioNo", form, section,
        address, bloodgroup, genotype, religion, tribe, gender,
        dob, phone, "studentImg", email, password, guardian_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
      [
        firstName, lastName, middleName, admissioNo, form, section,
        address, bloodgroup, genotype, religion, tribe, gender,
        dob, phone, studentImg, email, hashedPassword, guardianId
      ]
    );
    const newStudentId = studentResult.rows[0].id;

    // 6. Commit the transaction
    await client.query('COMMIT');

    // 7. Fetch and return the complete student record with guardian details
    const finalResult = await client.query(
      `SELECT s.id, s."firstName", s."lastName", s."middleName", s."admissioNo", s.form, s.section, s.address, s.bloodgroup, s.genotype, s.religion, s.tribe, s.gender, s.dob, s.phone, s."studentImg", s.email, g.name as guardian_name, g.phone as guardian_phone, g.status as guardian_status, g.email as guardian_email, g.img as guardian_img
       FROM students s
       JOIN guardians g ON s.guardian_id = g.id
       WHERE s.id = $1`,
      [newStudentId]
    );

    res.status(201).json(finalResult.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    // Provide more specific error messages
    if (err.code === '23505') { // Unique violation
        if (err.constraint.includes('students_email')) {
            return res.status(400).json({ error: 'A student with this email already exists.' });
        }
        if (err.constraint.includes('students_admissioNo')) {
            return res.status(400).json({ error: 'A student with this admission number already exists.' });
        }
    }
    console.error('Registration Transaction Error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Student login and get a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: 'john.doe@example.com'
 *               password:
 *                 type: string
 *                 example: 'password123'
 *     responses:
 *       '200':
 *         description: Login successful, returns a JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '401':
 *         description: Invalid credentials.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use quotes for "firstName" to match the schema
    const result = await pool.query('SELECT id, email, password, "firstName" FROM students WHERE email = $1', [email]);
    const student = result.rows[0];

    if (!student || !(await bcrypt.compare(password, student.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student.id, email: student.email, name: student.firstName, role: 'student' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

module.exports = router;
