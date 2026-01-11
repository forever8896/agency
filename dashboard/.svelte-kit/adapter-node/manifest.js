export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.DgBdrUKI.js",app:"_app/immutable/entry/app.DLuElxpL.js",imports:["_app/immutable/entry/start.DgBdrUKI.js","_app/immutable/chunks/P95OQn95.js","_app/immutable/chunks/BORSesdh.js","_app/immutable/chunks/DpH9poZx.js","_app/immutable/entry/app.DLuElxpL.js","_app/immutable/chunks/BORSesdh.js","_app/immutable/chunks/B3wjmNir.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";