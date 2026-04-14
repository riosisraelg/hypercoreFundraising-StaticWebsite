from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTQueryParameterAuthentication(JWTAuthentication):
    """
    Custom authentication class that allows JWT to be passed in the 'token' 
    query parameter. Useful for direct browser downloads (PDFs, Wallet passes)
    where setting an Authorization header is not possible.
    """
    def authenticate(self, request):
        # Look for 'token' in the URL query parameters
        token = request.query_params.get('token')
        
        if token:
            try:
                validated_token = self.get_validated_token(token)
                return self.get_user(validated_token), validated_token
            except:
                # If token is invalid/expired, fall back to standard header auth
                # or let it fail if header is also missing.
                pass
                
        return super().authenticate(request)
