package com.example.visio;

import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.graphics.RectF;

import org.tensorflow.lite.Interpreter;

import java.nio.BufferOverflowException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Classificator {
    private final Interpreter.Options tfliteOptions = new Interpreter.Options();
    private Interpreter tflite;

    private List<String> labelList;
    private ByteBuffer imgData;

    private int DIM_IMG_SIZE_X = 300;
    private int DIM_IMG_SIZE_Y = 300;
    private int DIM_PIXEL_SIZE = 3;

    private int[] intValues;

    Classificator(MappedByteBuffer model, List<String> labels) {
        intValues = new int[DIM_IMG_SIZE_X * DIM_IMG_SIZE_Y * DIM_PIXEL_SIZE];

        try {
            tflite = new Interpreter(model, tfliteOptions);
            labelList = labels;
        } catch (Exception e) {
            e.printStackTrace();
        }

        imgData = ByteBuffer.allocateDirect(1 * DIM_IMG_SIZE_Y * DIM_IMG_SIZE_X * DIM_PIXEL_SIZE);
        imgData.order(ByteOrder.nativeOrder());

    }

    public Result classify(Bitmap bitmap) {
        Bitmap resized = getResizedBitmap(bitmap, DIM_IMG_SIZE_X, DIM_IMG_SIZE_Y);

        convertBitmapToByteBuffer(resized);

        int NUM_DETECTIONS = 10;

        float[][][] outputLocations = new float[1][NUM_DETECTIONS][4];
        float[][] outputClasses = new float[1][NUM_DETECTIONS];
        float[][] outputScores = new float[1][NUM_DETECTIONS];
        float[] numDetections = new float[1];

        Object[] inputArray = {imgData};
        Map<Integer, Object> outputMap = new HashMap<>();
        outputMap.put(0, outputLocations);
        outputMap.put(1, outputClasses);
        outputMap.put(2, outputScores);
        outputMap.put(3, numDetections);

                tflite.runForMultipleInputsOutputs(inputArray, outputMap);

        String label = "";
        float score = 0;

        int index = 0;
        float max = 0;

        for (int i = 0; i < NUM_DETECTIONS; i++) {
            if (outputScores[0][i] > max) {
                max = outputScores[0][i];
                index = i;
            }
        }

        label = labelList.get((int) outputClasses[0][index] + 1);
        score = outputScores[0][index];

        final RectF rect = new RectF(
                outputLocations[0][index][1] * DIM_IMG_SIZE_X,
                outputLocations[0][index][0] * DIM_IMG_SIZE_X,
                outputLocations[0][index][3] * DIM_IMG_SIZE_X,
                outputLocations[0][index][2] * DIM_IMG_SIZE_X
                );


        return new Result(label, score, rect);
    }

    private Bitmap getResizedBitmap(Bitmap bitmap, int newWidth, int newHeight) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();

        float scaleWidth = ((float)newWidth / width);
        float scaleHeight = ((float)newHeight / height);

        Matrix matrix = new Matrix();
        matrix.postScale(scaleWidth, scaleHeight);
        Bitmap resized = Bitmap.createBitmap(bitmap, 0, 0, width, height, matrix, false);

        return resized;
    }

    private void convertBitmapToByteBuffer(Bitmap bitmap) {
        if (imgData == null) {
            return;
        }

        imgData.rewind();

        bitmap.getPixels(intValues, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
        int pixel = 0;

        for (int i = 0; i < DIM_IMG_SIZE_X; i++) {
            for (int j = 0; j < DIM_IMG_SIZE_Y; j++) {
                final int val = intValues[pixel++];

                try {
                    imgData.put((byte) ((val >> 16) & 0xFF));
                    imgData.put((byte) ((val >> 8) & 0xFF));
                    imgData.put((byte) (val & 0xFF));
                } catch (BufferOverflowException ex) {
                    ex.printStackTrace();
                }
            }
        }
    }
}
