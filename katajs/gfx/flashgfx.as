package {
    import flash.display.MovieClip
    import flash.text.TextField;
	import flash.external.*;

    public class flashgfx extends MovieClip {
    	public function calledFromJS():void {
			ExternalInterface.call("alert", "flash calling Javascript");	/// tricky! Like Inception
    	}
        function flashgfx() {
            var mytextfield:TextField = new TextField();
            mytextfield.border = true;
            mytextfield.width = 300;
            mytextfield.height = 30;
            mytextfield.text = "This is the flash canvas";
            addChild(mytextfield);
			ExternalInterface.addCallback("callFlash", calledFromJS);
        }
    }
}

