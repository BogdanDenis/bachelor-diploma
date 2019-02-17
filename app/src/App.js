import React, { Component } from 'react';
import {
	StyleSheet,
	View,
	TouchableOpacity,
	Text,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { TfImageRecognition } from 'react-native-tensorflow';
import RNFS from 'react-native-fs';

class App extends Component {
	constructor() {
		super();

		this.state = {
			result: '',
			recognitionError: '',
		};
	}

	async recognizeImage(image) {
		try {
			await Promise.all([RNFS.readFileAssets('labels.txt'), RNFS.readFileAssets('graph.pb')])
				.then(res => {
					console.log(res);
					(async function() {
						const [labels, model] = res;

						const tfImageRecognition = new TfImageRecognition({
							model,
							labels,
						});
			
						const results = await tfImageRecognition.recognize({
							image,
						});
			
						const resultText = `Name: ${results[0].name} - Confidence: ${results[0].confidence}`;
						this.setState({
							result: resultText,
						});
			
						await tfImageRecognition.close();
					})()
				});
		} catch(err) {
			this.setState({
				recognitionError: err.message,
			});
		}
	}

	takePicture = async function () {
		if (this.camera) {
			const options = { quality: 0.5, base64: true };
			const data = await this.camera.takePictureAsync(options);
			this.recognizeImage(data.base64);
		}
	};

	render() {
		return (
			<View style={styles.container}>
				<RNCamera
					ref={ref => {
						this.camera = ref;
					}}
					style={styles.preview}
					type={RNCamera.Constants.Type.back}
					permissionDialogTitle={'Permission to use camera'}
					permissionDialogMessage={'We need your permission to use your camera phone'}
					captureAudio={false}
				/>
				<View style={styles.buttonView}>
					<TouchableOpacity onPress={this.takePicture.bind(this)} style={styles.capture}>
						<Text style={{ fontSize: 14 }}> SNAP </Text>
						<Text style={{ fontSize: 12 }}>{this.state.result || this.state.recognitionError}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: 'black',
	},
	preview: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	capture: {
		flex: 0,
		backgroundColor: '#fff',
		borderRadius: 5,
		padding: 15,
		paddingHorizontal: 20,
		alignSelf: 'center',
		margin: 20,
	},
	buttonView: {
		flex: 0,
		flexDirection: 'row',
		justifyContent: 'center',
	}
});

export { App };
