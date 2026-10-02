package com.stellarnet.telecom;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
public class MainActivity extends Activity {
  private WebView view;
  public void onCreate(Bundle b){super.onCreate(b); view=new WebView(this); view.getSettings().setJavaScriptEnabled(true); view.loadUrl("https://oeql-quantum-telecom-phone.onrender.com/"); setContentView(view);}
}