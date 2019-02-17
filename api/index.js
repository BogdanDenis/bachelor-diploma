const fs = require('fs');
const express = require('express');

const app = express();

app.get('/graph', (req, res) => {
	const stream = fs.createReadStream(__dirname + '/graph.pb', { encoding: 'utf8' });

	stream.pipe(res);
});

app.get('/labels', (req, res) => {
	const stream = fs.createReadStream(__dirname + '/labels.txt', { encoding: 'utf8' });

	stream.pipe(res);
});

app.listen(9000, '0.0.0.0', () => {
	console.log('Started');
});
