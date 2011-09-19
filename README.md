jquery.xrender.jsとは
====
XMLレンダリング ライブラリ
HTMLの拡張属性にxpathを指定するだけで、xmlデータのバインドが可能になります。


    <div data-xrender-xml="rss20.xml">
        <div data-xrender-xpath="channel/title">ここにタイトルが入ります</div>
    </div>

data-xrender-xmlには読み込むxmlのurlを指定する。  
data-xrender-xpathには、読み込んだxmlのxpathを指定する。  
詳しい説明は、Rulesを参照してください。  

こだわったのは  
=====
* できるだけシンプルにすること。  
属性は最大４つ(data-xrender-xml, data-xrender-xpath, data-xrender-callback, data-xrender-filter)だけにする。  
例えば、if専用の属性は用意しない。必要なときはxpathかdata-xrender-filter内に書くことで対応する。  

* HTML要素を汚さないで、属性だけで完結すること  
デザイナーに要素内を弄ることを制限したくない。  
属性だけにしておくと、&lt;script&gt; を宣言していないときにはダミーデータを表示するといったことも可能に.
* data-xrender-filterにはjavascriptメソッドを直接指定可能にする。  
利便性がアップします  

* xpathでなくselectorでアクセスすることも考えたが、属性に直接アクセする書き方が見つけられなかったので、xpathにした。  
selectorだと、jsonフォーマットにも対応できることを考えたが、上記理由で切り捨てた。  

これらは、spryフレームワークと大きく違う特徴でもある。  

Browser Support
====
Google Chrome  
Firefox 4以上  

Internet Explorer8以上  

Requirement
====
jQuery  
http://jquery.com/  

※IEをサポートする場合  
@amachan作成のJavaScript-XPathを利用すると、動くようになります。(感謝！)  
http://coderepos.org/share/wiki/JavaScript-XPath  
(JavaScript-XPath は、 DOM 3 XPath を実装していないブラウザに対して、実用的な速度で動作する DOM 3 XPath のエンジンを追加します。)  


Rules
====

step 1. スクリプトを宣言する  
----  
    <script type="text/javascript" src="http://www.google.com/jsapi"></script>  
    <script type="text/javascript">google.load("jquery", "1.6.0");</script>  
    <script type="text/javascript" src="js/javascript-xpath.js"></script>  
    <script type="text/javascript" src="js/jquery.xrender.js"></script>  


step 2. data-xrender-xml
----
xmlのURLを指定します。

    <div data-xrender-xml="rss20.xml">
    </div>

data-xrender-xml属性を見つけると自動的にレンダリングを開始します。  

step 3. data-xrender-xpath
----
* バインドしたいxpathを指定します  

    `<div id="xmlroot" data-xrender-xml="rss20.xml">`  
        `<div data-xrender-xpath="channel/title">タイトル</div>`  
    `</div>`  

* 入れ子にした場合は相対パス扱いになります。  

 
    `<div id="xmlroot" data-xrender-xml="rss20.xml">`  
        `<div data-xrender-xpath="channel">`  
            `<div data-xrender-xpath="title"></div>`  
        `</div>`   
    `</div>`  

* href属性やsrc属性を指定する場合  

    `<a data-xrender-xpath="@href:url,text"></a>`  
    `<img data-xrender-xpath="@src:url"/>`

* 複数設定する場合は , でつなぐ  

以降オプション  

step 4. data-xrender-callback
----
xmlロード後呼ばれます  

    `<div id="xmlroot" data-xrender-xml="sample.xml" data-xrender-callback="onLoadXml"></div>`

    `function onLoadXml(xml, element) {  
    //処理を実装  
    }`

step 5. data-xrender-filter  
----
xpathバインド時に呼ばれます  

### メソッド予約語  
* repeat  
 繰り返し   

<!-- アイテムの数だけ繰り返します-->  

    <div data-xrender-xpath="channel/item" data-xrender-filter="repeat">
      <div data-xrender-xpath="title">タイトルが入ります</div>
      <div data-xrender-xpath="link">リンクが入ります</div>
    </div>

* hideIfEmpty  
  空のときに隠す
* removeIfEmpty
　空のときに削除する

* prefix('***')  
 プレフィックス  

* suffix('***')    
 サフィックス  

* javascriptがそのまま利用できます。  
    
    `<a data-xrender-xpath="@href:@id,title" data-xrender-filter="prefix('detail.html?id=')"></a>`  
    
### パラメータ予約語  

* this  
  data-xrender-xpath属性を設定している要素Object  

* node  
  xpathに指定されたnode  

    `<div data-xrender-xpath="guid" data-xrender-filter="setClickEvent(this)">test</div>`  

メソッド例  

    function setClickEvent(guid, element) {
        $(element).click(function(){
            alert(guid);
        });
      return false;//xpathをバインドしたくないときは、falseを返す
    }
  
※第一引数にxpathに指定した値が入ります。


重要
====
Same Origin Policyを回避するには、サーバー側で  
レスポンスヘッダにAccess-Control-Allow-Origin : * を設定してある必要があります。   
  
参考    
Ajax - Goodbye, JSONP. Hello, Access-Control-Allow-Origin  
http://blog.livedoor.jp/dankogai/archives/51502865.html