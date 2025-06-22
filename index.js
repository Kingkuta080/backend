const express = require('express');
const app = express();
const studentsRouter = require('./routes/students');
const { swaggerUi, swaggerSpec } = require('./swagger');
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3001', // Allow your frontend
  credentials: true                // If you're using cookies or headers
}));

app.use(express.json());

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);
app.use('/students', studentsRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
