const Joi = require('joi');

// Combined schema for Schedule registration, including guardian details.
// This single schema will be used in the /auth/register endpoint.
const registrationSchema = Joi.object({
  // Schedule Fields
  title: Joi.string().min(2).max(100).required(),
  category: Joi.string().min(2).max(100).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required(),
  Img: Joi.string().allow('').optional(),
});

// Schema for updating a Schedule's own inend_dateation.
// Guardian details are not updatable through this endpoint.
const updateScheduleSchema = Joi.object({
  title: Joi.string().min(2).max(100),
  category: Joi.string().min(2).max(100),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  Img: Joi.string().allow(''),
});

module.exports = {
  registrationSchema,
  updateScheduleSchema
}; 