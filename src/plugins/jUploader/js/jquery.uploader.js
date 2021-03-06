/**
 * Uploader: unobtrusive file uploads using Flash and jQuery.
 * Largely based on SWFUpload <http://profandesign.se/swfupload/>
 *
 * SWFUpload is (c) 2006-2007 Lars Huring, Olov Nilz�n and Mammon Media and is
 * released under the MIT License.
 *
 * Uploader is (c) 2007 Gilles van den Hoven (http://webunity.nl) and is dual
 * licensed under the MIT and GPL licenses.
 *
 * Documentation:
 * Please refer to the wiki on <http://docs.jquery.com> for up to date
 * documentation and Frequently Asked Questions.
 *
 * Licensing information:
 * MIT license <http://www.opensource.org/licenses/mit-license.php>
 * GPL license <http://www.opensource.org/licenses/gpl-license.php>
 */
(function($) {
	// If the UI scope is not availalable, add it
	$.ui = $.ui || {};

	/**
	 * Helper function to build strings
	 */
	$.ui.builder = function(sJoin) {
		this.aStrings = new Array;
		this.sJoin = (!sJoin) ? '' : sJoin;

		$.ui.builder.prototype.add = function(sData) {
			if (!sData) return;
			this.aStrings.push(sData);
		};

		$.ui.builder.prototype.toString = function() {
			return this.aStrings.join(this.sJoin);
		};
	};

	//
	// Generate UI uploader object
	$.ui.uploader = {
		locker: new Array(),
		/**
		 * This function is called from the Flash movie.
		 * @param string Callback name
		 * @param string Movie identifier
		 * @param variable Either a boolean or a "file" object
		 * @param variable If supplied, an object containing upload progress information
		 */
		callback: function(sWhat, sMovieID, vP1, vP2, vP3) {
			var oUploader = $.ui.uploader.locker[sMovieID];
			var fCb = oUploader.aCallback[sWhat];
			//
			// Check for valid function, and fire callback!
			if ($.isFunction(fCb)) {
				//
				// Base UI callback options (as discussed on the jQuery-UI mailinglist)
				oOpt = {
						event: sWhat,
						options: oUploader
					};

				//
				// Additional options, depending on the callback
				if ((sWhat == 'UploaderInitialized') || (sWhat == 'dialogPost'))
					oOpt.success = vP1;
				else if (sWhat == 'fileErrorHTTP')
					oOpt.errCode = vP3;
				else if (sWhat == 'fileErrorSecurity')
					oOpt.errString = vP3;

				// File and progress objects
				if (typeof vP1 == 'object')
					oOpt.oFile = vP1;

				if (typeof vP2 == 'object')
					oOpt.oProgress = vP2;

				//
				// Callback
				fCb(oOpt);
			}
		},

		/**
		 * Retreives the current date/time
		 */
		getDateTime: function() {
			var oDate = new Date();

			//
			// Date/time
			intDay = oDate.getDate();
			intMonth = (oDate.getMonth() + 1);
			intYear= oDate.getFullYear();
			intHours = oDate.getHours();
			intMinutes = oDate.getMinutes();
			intSeconds = oDate.getSeconds();

			//
			// Format
			strDay = (intDay < 10) ? '0' + intDay : intDay;
			strMonth = (intMonth < 10) ? '0' + intMonth : intMonth;
			strHours = (intHours < 10) ? '0' + intHours : intHours;
			strMinutes = (intMinutes < 10) ? '0' + intMinutes : intMinutes;
			strSeconds = (intSeconds < 10) ? '0' + intSeconds : intSeconds;

			return strDay + '-' + strMonth + '-' + intYear + ' ' + strHours + ':' + strMinutes + ':' + strSeconds;
		},
		/**
		 * Debug function
		 * @param string value to log
		 * @param boolean if we have to force the message
		 */
		log: function(intType, strMessage) {
				ojqLog = jQuery('div.UploaderLog');
				if (ojqLog.length < 1) {
					return;
				}

				//
				// Type of message?
				switch (intType) {
					case 1:
						strClass = 'error';
						break;
					case 2:
						strClass = 'critical';
						break;
					default:
						strClass = 'message';
						break;
				}

				//
				// Build HTML
				strHTML = '<div class="' + strClass + '">';
				strHTML+= '<div class="date">' + $.ui.uploader.getDateTime() + '</div>';
				strHTML+= strMessage;
				strHTML+= '</div>';

				//
				// Prepend
				ojqLog.prepend(strHTML);
			},
		/**
		 * Prints the settings of a person Uploader object
		 * @param object the object to "read"
		 */
		debug: function(oUploader) {
				$.uploader.log(0, '----- DEBUG SETTINGS START ----');
				$.uploader.log(0, 'ID: ' + oUploader.opt.sName);
				for (var sKey in oUploader.opt) {
					$.uploader.log(0, sKey + ': ' + oUploader.opt[sKey]);
				}
				$.uploader.log(0, '----- DEBUG SETTINGS END ----');
			},
		/**
		 * Formats the input to a readable filesize
		 * @param integer
		 */
		formatSize: function(iInput) {
				var aSize = Array('B', 'KB', 'MB', 'GB', 'TB');
				var iSize = iInput;
				var iIndex = 0;
				while (iSize > 1024) {
					iIndex++;
					iSize/=1024;
				}
				return (Math.round(iSize * 100) /100) + ' ' + aSize[iIndex];
			},
		/**
		 * Formats the input to a readable time format
		 * @param integer
		 */
		formatTime: function(iInput) {
				var sTime,iSeconds,iMinutes,iHours;
				iSeconds = Math.round(iInput % 60);
				iMinutes = Math.round((iInput / 60) % 60);
				iHours = Math.round(iInput / 3600);

				// Build the time
				sTime = '';
				if (iHours > 0)
					sTime+= ((iHours < 10) ? '0' + iHours : iHours) + ':';
				sTime+= ((iMinutes < 10) ? '0' + iMinutes : iMinutes) + ':';
				sTime+= ((iSeconds < 10) ? '0' + iSeconds : iSeconds);
				return sTime;
			},
		/**
		 * The actual constructor
		 */
		build: function(oOptions) {
			// Default options.
			// Callbacks, marked with an asterix are new for Uploader
			this.oUploaderConfig = {
					bDebug: false,
					sName: 'Uploader' + ($.ui.uploader.locker.length + 1),
					oBrowse: null,
					oUpload: null,
					oReset: null,
					sFileFilters: [ 'All files (*.*)|*.*' ],	// Allowed file types
					fMaxFilesize: 250,							// Max filesize (250kb)
					fMaxQueueCount: -1,							// Max numbers of files in queue (-1 = unlimited)
					fMaxQueueSize: 1000,						// Max queuesize (1mb)
					sBackendScript: '',							// Path to upload script (backend, e.g. PHP/Perl/CGI/ASP/.NET)
					sMovie: '',									// Path to flash movie with upload functionality
					aCallback: {
							UploaderInitialized: '',			// (callback) Flash file successfully loaded
							dialogPre: '',						// (callback*) Show dialog (just before dialog is shown, e.g. for lightbox :) :)
							dialogPost: '',						// (callback*) Hide dialog (just after dialog is shown, e.g. for lightbox :) :)
							queueStarted: '',					// Start uploading new queue
							queueEmpty: '',						// Was starting, but queue is empty!
							fileAdded: '',						// File added to queue
							fileRemoved: '',					// File removed from the queue
							fileCancelled: '',					// File was cancelled during upload
							queueCancelled: '',					// Complete queue cancelled
							queueCompleted: '',					// Queue completed
							fileStarted: '',					// Start with a new file
							fileProgress: '',					// Processing file
							fileCompleted: '',					// File complete
							fileErrorSize: '',					// File error (Size)
							fileErrorIO: '',					// File error (IO)
							fileErrorSecurity: '',				// File error (Security)
							fileErrorHTTP: ''					// File error (HTTP)
						}
				};

			if (oOptions)
				$.extend(this.oUploaderConfig, oOptions);

			// Encode file filers
			this.oUploaderConfig.sFileFilters = this.oUploaderConfig.sFileFilters.join('||');

			//
			// Check for passed objects
			if (!this.oUploaderConfig.oBrowse || !this.oUploaderConfig.sBackendScript) {
				alert('Configuration error!!\nPlease make sure you specify jQuery objects for a "browse for file" button, and specify an upload script.');
				return;
			}

			// Save reference to settings, it's all we need for further reference from Flash back to Javascript
			$.ui.uploader.locker[this.oUploaderConfig.sName] = this.oUploaderConfig;

			//
			// Build the HTML
			var oSbVars = new $.ui.builder('&');
			oSbVars.add('jsLibrary=jQuery');
			oSbVars.add('movieID=' + this.oUploaderConfig.sName);
			oSbVars.add('backendScript=' +  escape(this.oUploaderConfig.sBackendScript));
			oSbVars.add('fileFilters=' + escape(this.oUploaderConfig.sFileFilters));
			oSbVars.add('maxFilesize=' + this.oUploaderConfig.fMaxFilesize);
			oSbVars.add('maxQueueCount=' + this.oUploaderConfig.fMaxQueueCount);
			oSbVars.add('maxQueueSize=' + this.oUploaderConfig.fMaxQueueSize);
			sVars = oSbVars.toString();

			// Flash HTML
			var oSbFlash = new $.ui.builder();
			if ($.browser.msie) {
				oSbFlash.add('<object id="' + this.oUploaderConfig.sName + '" type="application/x-shockwave-flash" width="1" height="1">');
				oSbFlash.add('<param name="movie" value="' + this.oUploaderConfig.sMovie + '" />');
				oSbFlash.add('<param name="wmode" value="transparent" />');
				oSbFlash.add('<param name="menu" value="false" />');
				oSbFlash.add('<param name="FlashVars" value="' + sVars + '" />');
				oSbFlash.add('</object>');
			} else {
				oSbFlash.add('<embed');
				oSbFlash.add(' type="application/x-shockwave-flash"');
				oSbFlash.add(' id="' + this.oUploaderConfig.sName + '"');
				oSbFlash.add(' width="1"');
				oSbFlash.add(' height="1"');
				oSbFlash.add(' src="' + this.oUploaderConfig.sMovie + '"');
				oSbFlash.add(' wmode="transparent"');
				oSbFlash.add(' menu="false"');
				oSbFlash.add(' FlashVars="' + sVars + '" />');
			}

			//
			// Build the DOM nodes to hold the flash;
			var oContainer = document.createElement("div");
			oContainer.style.position = "absolute";
			oContainer.style.left = "0px";
			oContainer.style.top = "0px";
			oContainer.style.width = "0px";
			oContainer.style.height = "0px";
			$('body').append(oContainer);
			oContainer.innerHTML = oSbFlash.toString();

			// Assign click handlers
			var _this = this;
			this.oUploaderConfig.oBrowse.click(function() {
					$('#' + _this.oUploaderConfig.sName)[0].browseForFiles();
					return false;
				});

			if (this.oUploaderConfig.oUpload) {
				this.oUploaderConfig.oUpload.click(function() {
						$('#' + _this.oUploaderConfig.sName)[0].queueUploadNext();
						return false;
					});
			}

			if (this.oUploaderConfig.oReset) {
				this.oUploaderConfig.oReset.click(function() {
						// First, reset the queue
						$('#' + _this.oUploaderConfig.sName)[0].queueCancel();

						//
						// In case the form was reset
						if (this.type == 'reset') {
							this.form.reset();
						}
						return false;
					});
			}

			//
			// Return created object
			return this;
		}
	};

	/**
	 * Public function
	 */
	$.fn.uploader = function(oUploaderConfig) {
		return new $.ui.uploader.build(oUploaderConfig);
	};
})($);
