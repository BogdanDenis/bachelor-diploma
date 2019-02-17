const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const tf = require('@tensorflow/tfjs-node');

const config = require('../config');

function readDirectories(dirPath) {
	return new Promise((resolve, reject) => {
		fs.readdir(dirPath, (err, items) => {
			if (err) {
				reject(err);
			}

			resolve(items);
		});
	});
}


class Data {
	constructor() {
		this.classesPromise = this.setUpClasses();
	}

	setUpClasses() {
		return new Promise((resolve, reject) => {
			readDirectories(path.resolve(__dirname, config.TRAIN_PATH))
				.then(classes => {
					this.classes = classes;
					resolve();
				})
				.catch(err => {
					console.error(err);
				});
		});
	}

	getRandomImages(count, isTrain = true) {
		const getRandomClass = () => {
			return this.classes[Math.floor(Math.random() * this.classes.length)];
		};

		const getRandomImageName = (dir) => {
			return new Promise((resolve, reject) => {
				fs.readdir(dir, (err, images) => {
					if (err) {
						reject(err);
					}

					resolve(images[Math.floor(Math.random() * images.length)]);
				});
			});
		};

		const classMap = {
			'door': 0,
			'person': 1,
			'laptop': 2,
		};

		async function readImages() {
			try {
				const classes = [];
				const imageData = [];

				for (let i = 0; i < count; i++) {
					const randomClass = getRandomClass();
					const dir = path.resolve(
						__dirname,
						path.join(isTrain ? config.TRAIN_PATH : config.TEST_PATH, randomClass)
					);
					const randomImageName = await getRandomImageName(dir);

					let image = await jimp.read(path.join(dir, randomImageName));
					image = await image.resize(config.IMAGE_W, config.IMAGE_H);
					image = await image.quality(100);
					image = await image.greyscale();

					imageData.push(...Array.from(image.bitmap.data).filter((_, index) => {
						return index % 4 === 0;
					}));
					classes.push(randomClass);
				}

				const float32Arr = new Float32Array(imageData);
				const xs = tf.tensor4d(
					float32Arr,
					[count, config.IMAGE_W, config.IMAGE_H, 1]
				);
				const labelsArray = [];
				classes.forEach(className => {
					labelsArray.push(...Object.keys(classMap).reduce((labels, mapVal) => {
						labels.push(className === mapVal ? 1 : 0);

						return labels;
					}, []));
				});

				const labelsBuffer = Uint8Array.from(labelsArray);

				const labels = tf.tensor2d(
					labelsBuffer,
					[count, 3],
				);

				return {
					xs,
					labels,
				};
			} catch(e) {
				throw e;
			}
		};

		if (this.classesPromise.done) {
			return readImages();
		} else {
			return new Promise((resolve, reject) => {
				this.classesPromise
					.then(() => {
						readImages()
							.then(resolve)
							.catch(reject);
					});
			});
		}
	}
}


module.exports = {
	Data,
};
