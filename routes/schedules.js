const express = require('express');
const router = express.Router();
const pool = require('../db');
const { registrationSchema, updateScheduleSchema } = require('../validation/schedule');

/**
 * @swagger
 * /schedules:
 *   get:
 *     tags: [Schedules]
 *     summary: Get all schedules
 *     description: Retrieves a paginated list of schedules with search and sorting capabilities
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: The number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter schedules by title or category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, category, start_date, end_date, id]
 *           default: start_date
 *         description: Field to sort the results by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       '200':
 *         description: Successfully retrieved schedules list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Schedules retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     schedules:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Schedule'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalSchedules:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, search = '', sortBy = 'start_date', sortOrder = 'asc' } = req.query;
  try {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;
    let query = 'SELECT * FROM schedules';
    const queryParams = [];
    if (search) {
      query += ' WHERE title ILIKE $1 OR category ILIKE $1';
      queryParams.push(searchPattern);
    }
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalSchedules = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalSchedules / limit);
    // Sorting
    const validSortColumns = ['title', 'category', 'start_date', 'end_date', 'id'];
    const orderByColumn = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
    const orderDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${orderByColumn} ${orderDirection}`;
    // Pagination
    queryParams.push(limit, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    const result = await pool.query(query, queryParams);
    res.json({
      ok: true,
      message: 'Schedules retrieved successfully',
      data: {
        schedules: result.rows,
        pagination: {
          totalSchedules,
          totalPages,
          currentPage: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ ok: false, message: 'Internal server error', data: null });
  }
});

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     tags: [Schedules]
 *     summary: Get a schedule by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The schedule ID
 *     responses:
 *       '200':
 *         description: Schedule found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       '404':
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM schedules WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /schedules:
 *   post:
 *     tags: [Schedules]
 *     summary: Create a new schedule
 *     requestBody:
 *       $ref: '#/components/requestBodies/ScheduleCreate'
 *     responses:
 *       '201':
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Schedule created successfully
 *                 schedule:
 *                   $ref: '#/components/schemas/Schedule'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const { error } = registrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { title, category, start_date, end_date, Img } = req.body;
    const result = await pool.query(
      'INSERT INTO schedules (title, category, start_date, end_date, img) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, category, start_date, end_date, Img || '']
    );
    res.status(201).json({ message: 'Schedule created successfully', schedule: result.rows[0] });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /schedules/{id}:
 *   put:
 *     tags: [Schedules]
 *     summary: Update a schedule by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The schedule ID
 *     requestBody:
 *       $ref: '#/components/requestBodies/ScheduleUpdate'
 *     responses:
 *       '200':
 *         description: Schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Schedule updated successfully.
 *                 schedule:
 *                   $ref: '#/components/schemas/Schedule'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { error } = updateScheduleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { id } = req.params;
    const { title, category, start_date, end_date, Img } = req.body;
    const fields = [
      { name: 'title', value: title },
      { name: 'category', value: category },
      { name: 'start_date', value: start_date },
      { name: 'end_date', value: end_date },
      { name: 'img', value: Img }
    ];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    fields.forEach(field => {
      if (field.value !== undefined) {
        setClauses.push(`${field.name} = $${paramIndex++}`);
        values.push(field.value);
      }
    });
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    values.push(id);
    const query = `UPDATE schedules SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule updated successfully.', schedule: result.rows[0] });
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /schedules/{id}:
 *   delete:
 *     tags: [Schedules]
 *     summary: Delete a schedule by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The schedule ID
 *     responses:
 *       '200':
 *         description: Schedule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Schedule deleted successfully
 *       '404':
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 