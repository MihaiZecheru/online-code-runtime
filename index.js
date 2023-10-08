import fs from 'fs';
import http from 'http';
import express from 'express';
import { get_program, filepath, handle_writefile_err, handle_exec_err, remove_file } from './shared.js';
import { exec, spawn } from 'child_process';

const app = express();
app.use(express.json());

const server = http.createServer(app);
server.timeout = 60000; // 60s

const PORT = 3001;
const URL = "http://127.0.0.1:" + PORT;

if (!fs.existsSync('./code/')) {
	fs.mkdirSync('./code/');
}

app.get('/', (req, res) => {
	res.status(200).send(`To run code, use ${URL}/language/&lt;language&gt;/ where &lt;language&gt; is python, javascript, typescript, c, cpp, cs, or lua`);
});

app.get('/language/', (req, res) => {
	res.status(400).send(`To run code, use ${URL}/language/&lt;language&gt;/ where &lt;language&gt; is python, javascript, typescript, c, cpp, cs, or lua`);
});

app.post('/language/python', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });

	const fp = filepath('py');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		exec(`python ${fp}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp, stderr, false)) return;
			remove_file(fp);
			res.status(200).json({ output: stdout, error: stderr });
		});
	});
});

app.post('/language/javascript', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });

	const fp = filepath('js');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		// spawn() has to be used instead of exec because if node is used, the express server will be turned off if it is also being run with node, because the exec takes priority over the application
		const child = spawn('node', [fp])

		let _stdout = '';
		let _stderr = '';
		child.stdout.on('data', (data) => { _stdout += data });
		child.stderr.on('data', (data) => { _stderr += data });
		child.on('error', (err) => {
			if (err) {
				res.status(500).send({ error: `Error executing the program${ _stderr ? (':\n' + _stderr) : '.' }` });
				remove_file(fp);
			}
		});
		child.on('close', (code) => {
			remove_file(fp);
			res.status(200).json({ output: _stdout, error: _stderr });
		});
	});
});

app.post('/language/typescript', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });

	const fp = filepath('ts');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		exec(`tsc ${fp}`, (err, stdout, stderr) => {
			const fp_js = fp.replace('.ts', '.js');
			if (handle_exec_err(err, res, fp, null, true)) return;
			remove_file(fp, ['js']);
			
			// spawn() has to be used instead of exec because if node is used, the express server will be turned off if it is also being run with node, because the exec takes priority over the application
			const child = spawn('node', [fp_js])

			let _stdout = '';
			let _stderr = '';
			child.stdout.on('data', (data) => { _stdout += data });
			child.stderr.on('data', (data) => { _stderr += data });
			child.on('error', (err) => {
				if (err) {
					res.status(500).send({ error: `Error executing the program${ _stderr ? ':\n' + _stderr : '.' }` });
					remove_file(fp_js);
				}
			});
			child.on('close', (code) => {
				remove_file(fp_js);
				res.status(200).json({ output: _stdout, error: _stderr });
			});
		});
	});
});

app.post('/language/c', (req, res) => {
	const program = get_program(req);
	if (!program) return res.status(400).send({ error: 'No program provided.' });

	const fp = filepath('c');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;
		
		let fp_exe = fp.replace('.c', '.exe');
		exec(`gcc ${fp} -o ${fp_exe}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp, stderr, true)) return;
			remove_file(fp, ['exe']);

			// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
			const _fp_exe = fp_exe.replace('./code/', '');
			exec(`cd code && ${_fp_exe}`, (err, stdout, stderr) => {
				if (handle_exec_err(err, res, fp_exe, stderr, false)) return;
				remove_file(fp_exe);
				res.status(200).json({ output: stdout, error: stderr });
			});
		});
	})
});

app.listen(PORT, (err) => {
    if (err) console.error(err);
    else console.log("Server listening on", URL);
});