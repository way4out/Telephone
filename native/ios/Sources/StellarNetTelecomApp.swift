import SwiftUI
import WebKit
@main
struct StellarNetTelecomApp: App { var body: some Scene { WindowGroup { TelecomWebView().ignoresSafeArea() } } }
struct TelecomWebView: UIViewRepresentable {
 func makeUIView(context: Context) -> WKWebView {
  let config=WKWebViewConfiguration(); config.allowsInlineMediaPlayback=true
  let view=WKWebView(frame:.zero,configuration:config); view.allowsBackForwardNavigationGestures=true
  view.load(URLRequest(url:URL(string:"https://oeql-quantum-telecom-phone.onrender.com/")!)); return view
 }
 func updateUIView(_ view: WKWebView, context: Context) {}
}
