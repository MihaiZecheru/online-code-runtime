import fs from 'fs';
import http from 'http';
import express from 'express';
import express_ws from 'express-ws';
import { get_program, filepath, handle_writefile_err, handle_exec_err, remove_file, run_c, run_cpp, run_typescript, run_javascript, run_python } from './shared.js';
import { exec, spawn } from 'child_process';

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
// websockets for accepting inputs
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
// websockets for accepting inputs
// -----------------------------------------------------------------------------------------

app.ws('/io/python', (ws, req) => {
	let program = null;

	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			program = msg.substring(8);
			run_python(program);
		}
		else if (msg.startsWith('INPUT:'))
		{
			if (!program) return ws.send(JSON.stringify({ error: 'No program provided.' }));

			const fp = filepath('py');
			fs.writeFile(fp, program, (err) => {
				if (handle_writefile_err(err, ws, fp)) return;

				exec(`python ${fp}`, (err, stdout, stderr) => {
					if (handle_exec_err(err, ws, fp, stderr, false)) return;
					remove_file(fp);
					ws.send(JSON.stringify({ output: stdout, error: stderr }));
				});
			});
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