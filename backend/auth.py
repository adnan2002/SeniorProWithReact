import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from functools import wraps
from flask import request, jsonify
from config import JWKS_URL, REGION, USER_POOL_ID, APP_CLIENT_ID


# Fetch the JSON Web Key Set
jwks = requests.get(JWKS_URL).json()

def get_public_key(token):
    kid = jwt.get_unverified_header(token)['kid']
    for key in jwks['keys']:
        if key['kid'] == kid:
            return RSAAlgorithm.from_jwk(key)
    raise ValueError('Public key not found in JWKS')

def get_user_sub(token):
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded['sub']
    except jwt.InvalidTokenError:
        return None
    



def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Bearer token malformed'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            public_key = get_public_key(token)
            
            payload = jwt.decode(
                token, 
                public_key,
                algorithms=["RS256"],
                options={
                    'verify_exp': True,
                    'verify_aud': False,  
                    'verify_iss': True
                },
                issuer=f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}'
            )
            
            if payload['client_id'] != APP_CLIENT_ID:
                raise jwt.InvalidAudienceError("Invalid audience")
            
            if payload['token_use'] != 'access':
                raise jwt.InvalidTokenError("Invalid token use")
            
            request.user_sub = get_user_sub(token)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidAudienceError:
            return jsonify({'message': 'Invalid audience'}), 401
        except jwt.InvalidIssuerError:
            return jsonify({'message': 'Invalid issuer'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'message': f'Invalid token: {str(e)}'}), 401
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return jsonify({'message': f'Token is invalid! Error: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    return decorated