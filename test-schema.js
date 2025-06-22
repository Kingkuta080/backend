const pool = require('./db');

async function checkSchema() {
  try {
    // Check students table structure
    const studentsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'students' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Students table schema:');
    console.table(studentsResult.rows);
    
    // Check guardians table structure
    const guardiansResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardians' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nGuardians table schema:');
    console.table(guardiansResult.rows);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema(); 