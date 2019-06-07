package com.example.visio;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.graphics.RectF;
import android.hardware.Camera;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.SurfaceView;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.CameraBridgeViewBase;
import org.opencv.android.JavaCameraView;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Scalar;
import org.opencv.imgproc.Imgproc;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity implements CameraBridgeViewBase.CvCameraViewListener {
    private Classificator classificator;
    private JavaCameraView javaCameraView;
    private Mat mRgba;
    private String lastClass = "";
    private RectF position = new RectF(0,0,0,0);
    private TextToSpeech textToSpeech;
    private Timestamp lastRecognitionTime = new Timestamp(new Date().getTime());
    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case BaseLoaderCallback.SUCCESS: {
                    javaCameraView.enableView();
                    break;
                }
                default: {
                    super.onManagerConnected(status);
                    break;
                }

            }

        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);


        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[] {Manifest.permission.CAMERA}, 1);
            }
        }

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_main);

        javaCameraView = findViewById(R.id.camera_preview);
        javaCameraView.setVisibility(SurfaceView.VISIBLE);
        javaCameraView.setCvCameraViewListener(this);

        try {
            classificator = new Classificator(
                    loadModelFile(MainActivity.this, "model2.tflite"),
                    loadLabels()
            );
        } catch (IOException e) {
            e.printStackTrace();
        }

        this.textToSpeech = new TextToSpeech(getApplicationContext(), new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {

            }
        });
        this.textToSpeech.setLanguage(Locale.UK);
    }

    @Override
    protected void onPause() {
        super.onPause();

        if (javaCameraView != null) {
            javaCameraView.disableView();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        if (javaCameraView != null) {
            javaCameraView.disableView();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (OpenCVLoader.initDebug()) {
            Toast.makeText(this, "openCv successfully loaded", Toast.LENGTH_SHORT).show();
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);
        } else {
            Toast.makeText(this, "openCv cannot be loaded", Toast.LENGTH_SHORT).show();
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION_2_4_9, this, mLoaderCallback);
        }
    }

    @Override
    public void onCameraViewStarted(int width, int height) {
        mRgba = new Mat(height, width, CvType.CV_8UC4);
    }

    @Override
    public void onCameraViewStopped() {
        mRgba.release();
    }

    @Override
    public Mat onCameraFrame(Mat frame) {
        mRgba.release();
        mRgba = frame;
        final MainActivity that = this;

        if (canRunRecognition()) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Bitmap bitmap = Bitmap.createBitmap(mRgba.width(), mRgba.height(), Bitmap.Config.ARGB_8888);

                    Utils.matToBitmap(mRgba, bitmap);

                    Result res = classificator.classify(bitmap);

                    if (res.getScore() > 0.6) {
                        TextView textView = findViewById(R.id.textView);
                        String score = String.format(Locale.UK, "%.0f%%", res.getScore() * 100);

                        textView.setText(res.getLabel() + " " + score);
                        if (!((that).lastClass.equals(res.getLabel()))) {
                            (that).textToSpeech.speak(res.getLabel(), TextToSpeech.QUEUE_FLUSH, null);
                        }
                        (that).lastClass = res.getLabel();

                        position = res.getRect();
                    }
                }
            });

            lastRecognitionTime = new Timestamp(new Date().getTime());
        }

        if (this.position != null) {
            final float x1 = position.left * (mRgba.width() / 300);
            final float y1 = position.top * (mRgba.height() / 300);
            final float x2 = position.right * (mRgba.width() / 300);
            final float y2 = position.bottom * (mRgba.height() / 300);

            Imgproc.rectangle(
                    mRgba,
                    new Point(x1, y1),
                    new Point(x2, y2),
                    new Scalar(0, 0, 255),
                    5
            );
        }

        return mRgba;
    }

    private boolean canRunRecognition() {
        Timestamp currentTime = new Timestamp(new Date().getTime());

        return currentTime.getTime() - lastRecognitionTime.getTime() > 500;
    }

    private MappedByteBuffer loadModelFile(Activity activity, String modelFile) throws IOException {
        AssetFileDescriptor fileDescriptor = activity.getAssets().openFd(modelFile);
        FileInputStream inputStream = new FileInputStream(fileDescriptor.getFileDescriptor());
        FileChannel fileChannel = inputStream.getChannel();
        long startOffset = fileDescriptor.getStartOffset();
        long declaredLength = fileDescriptor.getDeclaredLength();

        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
    }

    private List<String> loadLabels() throws IOException {
        List<String> labelList = new ArrayList<String>();
        BufferedReader reader = new BufferedReader(new InputStreamReader(this.getAssets().open("labels2.txt")));
        String line;
        while ((line = reader.readLine()) != null) {
            labelList.add(line);
        }

        reader.close();
        return labelList;
    }
}
