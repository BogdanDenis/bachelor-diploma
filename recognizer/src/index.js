const tf = require('@tensorflow/tfjs-node');

const { Data } = require('./data');
const config = require('../config');

const data = new Data();

(async function() {
	const model = tf.sequential();

	model.add(tf.layers.conv2d({
		inputShape: [100, 100, 1],
		kernelSize: 5,
		filters: 8,
		strides: 1,
		activation: 'relu',
		kernelInitializer: 'VarianceScaling',
	}));

	model.add(tf.layers.maxPooling2d({
		poolSize: [2, 2],
		strides: [2, 2],
	}));

	model.add(tf.layers.conv2d({
		kernelSize: 5,
		filters: 16,
		strides: 1,
		activation: 'relu',
		kernelInitializer: 'VarianceScaling'
	}));
	
	model.add(tf.layers.maxPooling2d({
		poolSize: [2, 2],
		strides: [2, 2]
	}));

	model.add(tf.layers.flatten());

	model.add(tf.layers.dense({
		units: 3,
		kernelInitializer: 'VarianceScaling',
		activation: 'softmax',
	}));

	const LEARNING_RATE = 0.35;
	const optimizer = tf.train.sgd(LEARNING_RATE);

	model.compile({
		optimizer,
		loss: 'categoricalCrossentropy',
		metrics: 'accuracy',
	});

	for (let i = 0; i < config.TRAIN_BATCHES; i++) {
		const batch = await data.getRandomImages(config.BATCH_SIZE);

		let testBatch;
		let validationData;

		if (i % config.TEST_ITERATION_FREQUENCY === 0) {
			testBatch = await data.getRandomImages(config.TEST_BATCH_SIZE, true);

			validationData = [
				testBatch.xs.reshape([config.TEST_BATCH_SIZE, config.IMAGE_W, config.IMAGE_H, 1]),
				testBatch.labels,
			];
		}

		const history = await model.fit(
			batch.xs.reshape([config.BATCH_SIZE, config.IMAGE_W, config.IMAGE_H, 1]),
			batch.labels,
			{
				batchSize: config.BATCH_SIZE,
				validationData,
				epochs: 10,
			},
		);
	}
})();