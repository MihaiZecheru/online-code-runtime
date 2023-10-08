import fs from 'fs';
import express from 'express';
import { get_program, filepath, handle_writefile_err, handle_exec_err, remove_file } from './shared.js';
import { exec } from 'child_process';

const app = express();
app.use(express.json());

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
			if (handle_exec_err(err, res, fp)) return;
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

		exec(`node ${fp}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp)) return;
			remove_file(fp);
			res.status(200).json({ output: stdout, error: stderr });
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
			if (handle_exec_err(err, res, fp, true)) return;
			remove_file(fp, ['js']);
			
			const fp_js = fp.replace('.ts', '.js');
			exec(`node ${fp_js}`, (err, stdout, stderr) => {
				if (handle_exec_err(err, res, fp_js)) return;
				remove_file(fp_js);
				res.status(200).json({ output: stdout, error: stderr });
			});
		});
	});
});

app.post('/language/c', (req, res) => {

});

app.listen(PORT, (err) => {
    if (err) console.error(err);
    else console.log("Server listening on", URL);
});