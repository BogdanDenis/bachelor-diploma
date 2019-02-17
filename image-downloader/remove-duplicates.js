const fs = require('fs');
const path = require('path');
const md5file = require('md5-file/promise');

const getFileNames = (dir, callback) => {
	fs.readdir(dir, (err, files) => {
		callback(err, files);
	});
};

const calculateFileHashes = (hashMap = {}, files) => {
	return new Promise((resolve, reject) => {
		files.forEach((file, index) => {
			md5file(path.resolve(__dirname, file))
				.then(hash => {
					if (!hashMap[hash]) {
						hashMap[hash] = [];
					}
	
					hashMap[hash].push(file);
					console.log(hash);

					if (index === files.length - 1) {
						resolve(hashMap);
					}
				});
		});
	});
};

const calculateSomeFiles = (hashMap = {}, filePaths) => {
	return new Promise((resolve, reject) => {
		const paths = filePaths.splice(0, 1000);

		if (paths.length === 0) {
			resolve(hashMap);
		}

		calculateFileHashes(hashMap, paths)
			.then(() => {
				calculateSomeFiles(hashMap, filePaths)
					.then(newHashMap => resolve(newHashMap));
			});
	});
}

getFileNames(path.resolve(__dirname, '../images/temp/phone'), (err, files) => {
	if (err) {
		return console.error(err);
	}

	const filePaths = files.map(file => path.join('../images/temp/phone', file));
	
	calculateSomeFiles({}, filePaths)
		.then(hashMap => {
			Object.keys(hashMap).forEach(hash => {
				const files = hashMap[hash];

				files.slice(1).forEach(file => {
					fs.unlink(file, err => {
						if (err) {
							console.error(err);
						}
					});
				});
			});
		});
});
