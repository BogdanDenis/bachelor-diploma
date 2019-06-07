package com.example.visio;

import android.graphics.RectF;

public class Result {
    private String label;
    private float score;
    private RectF rect;

    Result(String label, float score, RectF rect) {
        this.label = label;
        this.score = score;
        this.rect = rect;
    }

    public RectF getRect() {
        return rect;
    }

    public String getLabel() {
        return label;
    }

    public Float getScore() {
        return score;
    }
}
