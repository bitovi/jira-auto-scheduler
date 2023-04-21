const axios = require("axios");

 const fetchTokenWithAccessCode = async (code, refresh = false) => {
    try {
        const codeKey = refresh ? 'refresh_token' : 'code';
        const body = {
            client_id: process.env.CLIENT_JIRA_CLIENT_ID,
            client_secret: process.env.JIRA_CLIENT_SECRET,
            [codeKey]: code,
            grant_type: refresh ? "refresh_token" : "authorization_code",
            redirect_uri: process.env.CLIENT_JIRA_CALLBACK_URL,
        }
        const response = await axios.post('https://auth.atlassian.com/oauth/token',body)
        const {
            access_token: accessToken,
            expires_in: expiresIn,
            refresh_token: refreshToken,
        } = response.data;
        const createdAt = Math.floor(new Date().getTime()/1000.0) - 50; //Substracting 50seconds from expiry time
        const expiryTimestamp = String(expiresIn + createdAt);
        let scopeId;
        if(!refresh) {
            scopeId = await fetchScopeId(accessToken);
        }
        return {
            error: false,
            data: {
                accessToken,
                refreshToken,
                expiryTimestamp,
                scopeId,
            }
        }
    } catch (error) {
        //handle error properly.
        console.error(error);
        return {
            error: true,
            message: `${error?.response?.message}` ?? `${error.message}`
        }
    }
}

const fetchScopeId = async (accessToken) => {
    let config = {}
    config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    }
    const url = `https://api.atlassian.com/oauth/token/accessible-resources`;
    const response = await axios.get(url, config);
    const scopeId = response.data[0]?.id;
    return scopeId;
}

module.exports = {
    fetchTokenWithAccessCode,
    fetchScopeId,
}
