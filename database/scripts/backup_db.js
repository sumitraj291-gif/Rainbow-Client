const fs = require('fs');
const path = require('path');
const mysql = require(path.join(__dirname, '../../backend/node_modules/mysql2/promise'));


async function backupDatabase() {
    console.log('Starting full database backup...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'production_management'
    });

    const [tables] = await connection.query('SHOW TABLES');
    const backup = {
        timestamp: new Date().toISOString(),
        database: 'production_management',
        data: {}
    };

    for (const row of tables) {
        const tableName = Object.values(row)[0];
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
        backup.data[tableName] = rows;
    }

    const backupFile = path.join(__dirname, '..', `backup_pre_cleanup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`Backup completed successfully! Saved to: ${backupFile}`);

    await connection.end();
}

backupDatabase().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
});
