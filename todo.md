ssh root@143.198.149.232
qaz2Wsxedc

# TODO
1) Calculate TRX according to USDT API


# Session
1) For anytype of posting or data change we need to verify the sessionID if that's exists and didn't expired yet
2) Steps
   <!-- 1) save the session as a cookie to thee client -->
   2) send the userSession in every request
   3) verify the sesssionID 
      1) if yes good otherwise throw new error
   4) Rest things are good
    