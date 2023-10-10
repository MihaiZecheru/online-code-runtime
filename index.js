import fs from 'fs';
import http from 'http';
import express from 'express';
import express_ws from 'express-ws';
import { exec, spawn } from 'child_process';
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
const URL = "https://bv.mzecheru.com";

if (!fs.existsSync('./code/')) {
	fs.mkdirSync('./code/');
}

const help_message = `To run code and receive an output, send post to <b>${URL}/execute/&lt;language&gt;/</b>, and to run code with inputs and outputs, connect a websocket to <b>${URL}/io/&lt;language&gt;/</b>, where &lt;language&gt; is python, javascript, typescript, c, cpp, csharp, rust, or lua.<br/><br/>To run code using /execute/, send { "program": "<your code>" } in the body.<br/><br/>To run code using /io/, form a websocket connection with a /io/ url and send your program using the following format: "PROGRAM:your code can go here, just make sure to start with the word 'program' in all caps followed by a colon."<br/><br/>The websocket server will capture and send all outputs from your program, and those messages will be a stringified JSON object that looks like this: { "output": "this is output captured by the program", "error": "errors will be written here if they occurred" }.<br/><br/>The websocket knows to listen for an input if it sees "(INPUT)" anywhere in the program's output. Modify your code's input() and cout statements to contain "(INPUT)" Send expected inputs over the websocket server by starting the message with "INPUT:this is the stuff you want to send to your program when it requires an input".`;

app.get('/', (req, res) => {
	res.status(400).send(help_message);
});

app.get('/help/', (req, res) => {
	res.status(400).send(help_message);
});

// -----------------------------------------------------------------------------------------
// execute the program, return output and error, no inputs
// -----------------------------------------------------------------------------------------

app.get('/execute/', (req, res) => {
	res.status(400).send(help_message);
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

app.post('/execute/csharp', (req, res) => {
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
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
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

app.ws('/io/javascript', (ws, req) => {
	ws.send('WEBSOCKET ERROR: javascript is not supported for websockets as there is no way to get input without an external module');
});

app.ws('/io/typescript', (ws, req) => {
	ws.send('WEBSOCKET ERROR: javascript is not supported for websockets as there is no way to get input without an external module');
});

// TODO: include in documentation that c requires setbuf(stdout, NULL); to be called in main for the io to work
app.ws('/io/c', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			let program = msg.substring(8);

			// c requires setbuf(stdout, NULL); to be called in main for the io to work
			const m = program.match(/int main\s*\((.*?)\)\s*{/);
			if (m) {
				const index = m.index;
				const len = m[0].length;

				// insert setbuf(stdout, NULL); after the opening brace of main
				program = program.substring(0, index + len) + '\n\tsetbuf(stdout, NULL);' + program.substring(index + len);
			}
			const fp = filepath('c');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
				}

				let fp_exe = fp.replace('.c', '.exe');
				exec(`gcc ${fp} -o ${fp_exe}`, (err, stdout, stderr) => {
					if (err) {
						ws.send(`WEBSOCKET ERROR: error compiling the program${ stderr ? (':\n' + stderr) : '.' }`);
						return remove_file(fp);
					} else remove_file(fp, ['exe']);

					// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
					child = spawn(fp_exe, { stdio: 'pipe' });
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

app.ws('/io/cpp', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			const program = msg.substring(8);
			const fp = filepath('cpp');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
				}

				let fp_exe = fp.replace('.cpp', '.exe');
				exec(`gpp ${fp} -o ${fp_exe}`, (err, stdout, stderr) => {
					if (err) {
						ws.send(`WEBSOCKET ERROR: error compiling the program${ stderr ? (':\n' + stderr) : '.' }`);
						return remove_file(fp);
					} else remove_file(fp, ['exe']);

					// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
					child = spawn(fp_exe, { stdio: 'pipe' });
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
// TODO: include in documentation that (INPUT) is required in the input prompt when prompting the user for an input for every language.
app.ws('/io/csharp', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			const program = msg.substring(8);
			const fp = filepath('cs');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
				}

				let fp_exe = fp.replace('.cs', '.exe');
				exec(`csc ${fp} -out:${fp_exe}`, (err, stdout, stderr) => {
					if (err) {
						ws.send(`WEBSOCKET ERROR: error compiling the program${ stderr ? (':\n' + stderr) : '.' }`);
						return remove_file(fp);
					} else remove_file(fp, ['exe']);

					// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
					child = spawn(fp_exe, { stdio: 'pipe' });
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

app.ws('/io/rust', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			const program = msg.substring(8);
			const fp = filepath('rs');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
				}

				let fp_exe = fp.replace('.rs', '.exe');
				exec(`cd code && rustc ${fp.replace('./code/', '')}`, (err, stdout, stderr) => {
					if (err) {
						ws.send(`WEBSOCKET ERROR: error compiling the program${ stderr ? (':\n' + stderr) : '.' }`);
						return remove_file(fp);
					} else remove_file(fp, ['exe']);

					// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
					child = spawn(fp_exe, { stdio: 'pipe' });
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

// TODO: include in documentation that Lua has the same feature as c where the stdout needs to be flushed. io.stdout:setvbuf("no") needs to be added to the top of the file
app.ws('/io/lua', (ws, req) => {
	let child;
	ws.on('message', (msg) => {
		if (msg.startsWith('PROGRAM:'))
		{
			let program = msg.substring(8);
			// Lua has the same feature as c where the stdout needs to be flushed. io.stdout:setvbuf("no") needs to be added to the top of the file
			program = 'io.stdout:setvbuf("no")\n' + program;
			const fp = filepath('lua');
			fs.writeFile(fp, program, (err) => {
				if (err) {
					ws.send('WEBSOCKET ERROR: error writing to file');
					ws.close();
					return remove_file(fp);
				}

				// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
				child = spawn('lua', [fp], { stdio: 'pipe' });
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
