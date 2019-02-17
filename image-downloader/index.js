const fs = require('fs');
const path = require('path');
const Flickrsdk = require('flickr-sdk');
const jimp = require('jimp');

const API_KEY = 'f996a70cf40fe19a19f87931b5a54252';

const flickr = new Flickrsdk(API_KEY);

const name = 'person';
const keywords = 'person';

let lastSaved = -1;

function downloadImage(url) {
	return new Promise((resolve, reject) => {
		jimp.read(url)
			.then(image => {
				const imageName = `${name}/${name}-${++lastSaved}.jpg`;

				image
					.resize(800, 600)
					.quality(100)
					.writeAsync(path.resolve(__dirname, `../images/temp/${imageName}`))
						.then(() => {
							resolve();
						})
						.catch(e => {
							reject(e);
						});
			})
			.catch(e => {
				reject(e);
			});
	});
}

function downloadBatch(page, batchSize, callback) {
	flickr.photos.search({
		text: keywords,
    	per_page: batchSize,
		page,
	}).then(res => {
		const photos = res.body.photos.photo;
		let savedCount = 0;

		photos.map((photo, index) => {
			const url = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`;
			downloadImage(url)
				.then(() => {
					console.log(`saved ${imageName}`);

					if (++savedCount === photos.length) {
						console.log(`saved page ${page}`);
						callback(null, savedCount);
					}
				})
				.catch(e => {
					savedCount++;
					console.error(e);
				})
		});
	}).catch(callback);
};

const imageCountToDownload = 5000;
let imagesDownloaded = 0;
const batchSize = 500;
let page = 21;
const errorThreshold = 5;
let errorCount = 0;

const downloadBatchCallback = (err, downloadedCount) => {
	if (err) {
		console.error(err);

		if (++errorCount === errorThreshold) {
			return;
		}
	}

	imagesDownloaded += downloadedCount;

	if (imagesDownloaded >= imageCountToDownload) {
		return;
	}

	const nextBatchSize = Math.min(imageCountToDownload - imagesDownloaded, batchSize);
	downloadBatch(page++, nextBatchSize, downloadBatchCallback);
};

//downloadBatch(page++, batchSize, downloadBatchCallback);

const json = fs.readFileSync('./image-srcs.json', 'utf8');
const srcs = JSON.parse(json);

async function downloadFromSrcArray(srcs) {
	return new Promise((resolve, reject) => {
		srcs.forEach((src, index) => {
			downloadImage(src)
				.then(() => {
					if (srcs.length - 1 === index) {
						resolve();
					}
				});
		});
	});
}

(async function() {
	while(srcs.length > 0) {
		await downloadFromSrcArray(srcs.splice(0, 100));
	}
})();
