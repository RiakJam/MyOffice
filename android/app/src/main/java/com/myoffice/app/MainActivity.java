package com.myoffice.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SaveDocumentPlugin.class);
        registerPlugin(StoreLinkPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
