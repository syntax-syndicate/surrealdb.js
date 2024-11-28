import type { EngineDisconnected } from "../errors";
import type {
	ExportOptions,
	LiveHandlerArguments,
	RpcRequest,
	RpcResponse,
} from "../types";
import type { Emitter } from "../util/emitter";
import type { ReconnectContext } from "../util/reconnect";

export type Engine = new (context: EngineContext) => AbstractEngine;
export type Engines = Record<string, Engine>;
export const RetryMessage: unique symbol = Symbol("RetryMessage");

export type EngineEvents = {
	connecting: [];
	connected: [];
	reconnecting: [];
	disconnected: [];
	error: [Error];

	[K: `rpc-${string | number}`]: [
		RpcResponse | EngineDisconnected | typeof RetryMessage,
	];
	[K: `live-${string}`]: LiveHandlerArguments;
};

export enum ConnectionStatus {
	Disconnected = "disconnected",
	Connecting = "connecting",
	Reconnecting = "reconnecting",
	Connected = "connected",
	Error = "error",
}

export class EngineContext {
	readonly emitter: Emitter<EngineEvents>;
	readonly encodeCbor: (value: unknown) => ArrayBuffer;
	// biome-ignore lint/suspicious/noExplicitAny: Don't know what it will return
	readonly decodeCbor: (value: ArrayBufferLike) => any;
	readonly reconnect: ReconnectContext;

	constructor({
		emitter,
		encodeCbor,
		decodeCbor,
		reconnect,
	}: {
		emitter: Emitter<EngineEvents>;
		encodeCbor: (value: unknown) => ArrayBuffer;
		// biome-ignore lint/suspicious/noExplicitAny: Don't know what it will return
		decodeCbor: (value: ArrayBufferLike) => any;
		reconnect: ReconnectContext;
	}) {
		this.emitter = emitter;
		this.encodeCbor = encodeCbor;
		this.decodeCbor = decodeCbor;
		this.reconnect = reconnect;
	}
}

export abstract class AbstractEngine {
	readonly context: EngineContext;
	ready: Promise<void> | undefined;
	status: ConnectionStatus = ConnectionStatus.Disconnected;
	connection: {
		url: URL | undefined;
		namespace: string | undefined;
		database: string | undefined;
		token: string | undefined;
	} = {
		url: undefined,
		namespace: undefined,
		database: undefined,
		token: undefined,
	};

	constructor(context: EngineContext) {
		this.context = context;
	}

	get emitter(): EngineContext["emitter"] {
		return this.context.emitter;
	}

	get encodeCbor(): EngineContext["encodeCbor"] {
		return this.context.encodeCbor;
	}

	get decodeCbor(): EngineContext["decodeCbor"] {
		return this.context.decodeCbor;
	}

	abstract connect(url: URL): Promise<void>;
	abstract disconnect(): Promise<void>;
	abstract rpc<
		Method extends string,
		Params extends unknown[] | undefined,
		Result,
	>(request: RpcRequest<Method, Params>): Promise<RpcResponse<Result>>;

	abstract version(url: URL, timeout?: number): Promise<string>;
	abstract export(options?: Partial<ExportOptions>): Promise<string>;
}
