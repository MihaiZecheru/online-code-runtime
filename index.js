import fs from 'fs';
import http from 'http';
import express from 'express';
import express_ws from 'express-ws';
import { spawn } from 'child_process';
import {
	get_program, filepath, remove_file,
	run_python, run_javascript, run_typescript, run_c, run_cpp, run_csharp, run_rust, run_lua
} from './shared.js';

const app = express();
app.use(express.json());
express_ws(app);

const server = http.createServer(app);
server.timeout = 60000; // 60s

const PORT = 3001;
const URL = "http://127.0.0.1:" + PORT;

if (!fs.existsSync('./code/')) {
	fs.mkdirSync('./code/');
}

app.get('/', (req, res) => {
	res.status(200).send(`To run code, use ${URL}/execute/&lt;language&gt;/ where &lt;language&gt; is python, javascript, typescript, c, cpp, cs, rust, or lua`);
});

// -----------------------------------------------------------------------------------------
// execute the program, return output and error, no inputs
// -----------------------------------------------------------------------------------------

app.get('/execute/', (req, res) => {
	res.status(400).send(`To run code, use ${URL}/execute/&lt;language&gt;/ where &lt;language&gt; is python, javascript, typescript, c, cpp, cs, rust, or lua`);
});

app.post('/execute/python', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_python(program, res);
});

app.post('/execute/javascript', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_javascript(program, res);
});

app.post('/execute/typescript', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_typescript(program, res);
});

app.post('/execute/c', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_c(program, res);
});

app.post('/execute/cpp', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_cpp(program, res);
});

app.post('/execute/cs', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_csharp(program, res);
});

app.post('/execute/rust', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_rust(program, res);
});

app.post('/execute/lua', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });
	run_lua(program, res);
});

// -----------------------------------------------------------------------------------------
// websockets for accepting inputs throughout the program's execution
// -----------------------------------------------------------------------------------------

app.ws('/io/python', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			const program = msg.substring(8);
			const fp = filepath('py');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					console.error(err);
					res.status(500).send(JSON.stringify({ error: 'Error writing to file.' }));
					remove_file(fp);
				}

				child = spawn('python', [fp], { stdio: 'pipe' });
				child.stdout.on('data', (data) => { ws.send(JSON.stringify({ output: data.toString() })) });
				child.stderr.on('data', (data) => { ws.send(JSON.stringify({ error: data.toString() })) });
				child.on('exit', () => {
					remove_file(fp);
					ws.send("PROGRAM END: websocket closed");
					ws.close();
				});
				child.stdin.on('error', (err) => {
					ws.send('WEBSOCKET ERROR: error processing input');
					ws.close();
				});
			});
		}
		else if (msg.startsWith('INPUT:'))
		{
			const input = msg.substring(6);
			child.stdin.write(input);
			child.stdin.end();
		}
	});
});



// -----------------------------------------------------------------------------------------
// start server
//-----------------------------------------------------------------------------------------

app.listen(PORT, (err) => {
    if (err) console.error(err);
    else console.log("Server listening on", URL);
});