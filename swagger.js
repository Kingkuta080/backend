const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management API',
      version: '1.0.0',
      description: 'API for registering and managing students and their guardians.',
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [
      { name: 'Authentication', description: 'Endpoints for user registration and login.' },
      { name: 'Students', description: 'Endpoints for fetching, updating, and deleting student records.' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      requestBodies: {
        UpdateStudent: {
          description: 'Fields to update for a student. All fields are optional.',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateStudentInput'
              }
            }
          }
        }
      },
      schemas: {
        RegistrationInput: {
          type: 'object',
          required: [
            'firstName', 'lastName', 'admissioNo', 'form', 'section', 'address', 'bloodgroup', 'genotype', 'religion', 'tribe', 'gender', 'dob', 'phone', 'email', 'password',
            'guardianName', 'guardianPhone', 'guardianStatus', 'guardianEmail'
          ],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            middleName: { type: 'string', example: 'Ray' },
            admissioNo: { type: 'string', example: 'SCH-001' },
            form: { type: 'string', example: 'JSS1' },
            section: { type: 'string', example: 'A' },
            address: { type: 'string', example: '123 Main St, Anytown' },
            bloodgroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], example: 'O+' },
            genotype: { type: 'string', enum: ['AA', 'AS', 'SS', 'AC'], example: 'AA' },
            religion: { type: 'string', example: 'Christianity' },
            tribe: { type: 'string', example: 'Yoruba' },
            gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
            dob: { type: 'string', format: 'date', example: '2010-01-15' },
            phone: { type: 'string', example: '08012345678' },
            studentImg: { type: 'string', format: 'uri', example: 'http://example.com/student.jpg' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            password: { type: 'string', format: 'password', example: 'password123' },
            guardianName: { type: 'string', example: 'Jane Doe' },
            guardianPhone: { type: 'string', example: '08087654321' },
            guardianStatus: { type: 'string', enum: ['father', 'mother', 'guardian'], example: 'mother' },
            guardianEmail: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
            guardianImg: { type: 'string', format: 'uri', example: 'http://example.com/guardian.jpg' },
          }
        },
        UpdateStudentInput: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            middleName: { type: 'string' },
            admissioNo: { type: 'string' },
            form: { type: 'string' },
            section: { type: 'string' },
            address: { type: 'string' },
            bloodgroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
            genotype: { type: 'string', enum: ['AA', 'AS', 'SS', 'AC'] },
            religion: { type: 'string' },
            tribe: { type: 'string' },
            gender: { type: 'string', enum: ['male', 'female'] },
            dob: { type: 'string', format: 'date' },
            phone: { type: 'string' },
            studentImg: { type: 'string', format: 'uri' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password', description: 'Provide a new password to update it.' },
          }
        },
        StudentWithGuardian: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            middleName: { type: 'string' },
            admissioNo: { type: 'string' },
            form: { type: 'string' },
            section: { type: 'string' },
            address: { type: 'string' },
            bloodgroup: { type: 'string' },
            genotype: { type: 'string' },
            religion: { type: 'string' },
            tribe: { type: 'string' },
            gender: { type: 'string' },
            dob: { type: 'string', format: 'date' },
            phone: { type: 'string' },
            studentImg: { type: 'string' },
            email: { type: 'string' },
            guardian_name: { type: 'string' },
            guardian_phone: { type: 'string' },
            guardian_status: { type: 'string' },
            guardian_email: { type: 'string' },
            guardian_img: { type: 'string' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'], // Point to your route files
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
