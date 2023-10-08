import fs from 'fs';
import http from 'http';
import express from 'express';
import express_ws from 'express-ws';
import { exec, spawn } from 'child_process';

export function get_program(req, res) {
  return req.body?.program;
}

export function filepath(ext) {
  return `./code/${Date.now()}.${ext}`;
}

function handle_writefile_err(err, res, fp) {
  if (err) {
    console.error(err);
    res.status(500).send({ error: 'Error writing to file.' });
    remove_file(fp);
    return true;
  }
}

/**
 * 
 * @param {*} err err object from exec callback
 * @param {*} res res object from express callback
 * @param {*} fp path to the file
 * @param {*} stderr stderr object from exec callback
 * @param {*} compile if true, errors will say 'error compiling' instead of 'error executing'
 */
function handle_exec_err(err, res, fp, stderr = null, compile = false) {
  if (err) {
    res.status(500).send({ error: `Error ${ compile ? 'compiling' : 'executing' } the program${ stderr ? (':\n' + stderr) : '.' }` });
    remove_file(fp);
    return true;
  }
}

export function remove_file(filepath, exceptions = []) {
  // remove extension
  const fp = '.' + filepath.split('.').slice(0, -1).join('');

  // remove all possible extensions
  for (const ext of ['py', 'js', 'ts', 'c', 'cpp', 'cs', 'rs', 'lua', 'exe']) {
    if (!fs.existsSync(`${fp}.${ext}`)) continue;
    if (exceptions.includes(ext)) continue;
    fs.unlink(`${fp}.${ext}`, (err) => {
      if (err) console.error(err);
    });
  }
}

export function run_python(program, res) {
  const fp = filepath('py');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		exec(`python ${fp}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp, stderr, false)) return;
			remove_file(fp);
			res.status(200).json({ output: stdout, error: stderr });
		});
	});
}

export function run_javascript(program, res) {
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
}

export function run_typescript(program, res) {
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
}

export function run_c(program, res) {
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
	});
}

export function run_cpp(program, res) {
  const fp = filepath('cpp');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;
		
		let fp_exe = fp.replace('.cpp', '.exe');
		exec(`gpp ${fp} -o ${fp_exe}`, (err, stdout, stderr) => {
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
	});
}

export function run_csharp(program, res) {
  const fp = filepath('cs');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		let fp_exe = fp.replace('.cs', '.exe');
		exec(`csc ${fp} -out:${fp_exe}`, (err, stdout, stderr) => {
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
	});
}

export function run_rust(program, res) {
  const fp = filepath('rs');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		exec(`cd code && rustc ${fp.replace('./code/', '')}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp, stderr, true)) return;
			remove_file(fp, ['exe']);

			// remove './code/' prefix from fp_exe because exec was throwing an error, saying './code/' is not a recognizable command
			const fp_exe = fp.replace('./code/', '').replace('.rs', '.exe');
			exec(`cd code && ${fp_exe}`, (err, stdout, stderr) => {
				if (handle_exec_err(err, res, './code/' + fp_exe, stderr, false)) return;
				remove_file('./code/' + fp_exe);
				res.status(200).json({ output: stdout, error: stderr });
			});
		});
	});
}

export function run_lua(program, res) {
  const fp = filepath('lua');
	fs.writeFile(fp, program, (err) => {
		if (handle_writefile_err(err, res, fp)) return;

		exec(`lua ${fp}`, (err, stdout, stderr) => {
			if (handle_exec_err(err, res, fp, stderr, false)) return;
			remove_file(fp);
			res.status(200).json({ output: stdout, error: stderr });
		});
	});
}