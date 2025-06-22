const Joi = require('joi');

// Combined schema for student registration, including guardian details.
// This single schema will be used in the /auth/register endpoint.
const registrationSchema = Joi.object({
  // Student Fields
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  middleName: Joi.string().min(2).max(100).allow('').optional(),
  admissioNo: Joi.string().min(1).max(50).required(),
  form: Joi.string().min(1).max(20).required(),
  section: Joi.string().min(1).max(10).required(),
  address: Joi.string().min(10).max(500).required(),
  bloodgroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  genotype: Joi.string().valid('AA', 'AS', 'SS', 'AC').required(),
  religion: Joi.string().min(2).max(50).required(),
  tribe: Joi.string().min(2).max(50).required(),
  gender: Joi.string().valid('male', 'female').required(),
  dob: Joi.date().iso().required(),
  phone: Joi.string().min(10).max(15).required(), // Student's phone
  studentImg: Joi.string().allow('').optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),

  // Guardian Fields
  guardianName: Joi.string().min(2).max(100).required(),
  guardianPhone: Joi.string().min(10).max(20).required(),
  guardianStatus: Joi.string().valid('father', 'mother', 'guardian').required(),
  guardianEmail: Joi.string().email().required(),
  guardianImg: Joi.string().allow('').optional()
});

// Schema for updating a student's own information.
// Guardian details are not updatable through this endpoint.
const updateStudentSchema = Joi.object({
  firstName: Joi.string().min(2).max(100),
  lastName: Joi.string().min(2).max(100),
  middleName: Joi.string().min(2).max(100).allow(''),
  admissioNo: Joi.string().min(1).max(50),
  form: Joi.string().min(1).max(20),
  section: Joi.string().min(1).max(10),
  address: Joi.string().min(10).max(500),
  bloodgroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  genotype: Joi.string().valid('AA', 'AS', 'SS', 'AC'),
  religion: Joi.string().min(2).max(50),
  tribe: Joi.string().min(2).max(50),
  gender: Joi.string().valid('male', 'female'),
  dob: Joi.date().iso(),
  phone: Joi.string().min(10).max(15),
  studentImg: Joi.string().allow(''),
  email: Joi.string().email(),
  // Password can be updated, but is optional.
  password: Joi.string().min(6).optional()
});

module.exports = {
  registrationSchema,
  updateStudentSchema
}; 