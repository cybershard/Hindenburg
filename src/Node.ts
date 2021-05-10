import ioredis from "ioredis";
import winston from "winston";

import { EventEmitter, EventData } from "@skeldjs/events";
import { AnticheatConfig } from "./Anticheat";
export interface RedisServerConfig {
    host: string;
    port: number;
    password?: string;
}

export interface HindenburgClusterConfig {
    name: string;
    ip: string;
    ports: number[];
}

export interface HindenburgLoadBalancerServerConfig {
    clusters: HindenburgClusterConfig[];
    ip: string;
    port: number;
}

export interface ModConfig {
    version: string;
    required: boolean;
    banned: boolean;
}

export interface ReactorModConfig {
    [key: string]: string|ModConfig;
}

export interface ReactorConfig {
    mods: ReactorModConfig;
    allowExtraMods: boolean;
    requireHostMods: boolean;
}

export interface HindenburgConfig {
    reactor: boolean|ReactorConfig;
    anticheat: AnticheatConfig;
    cluster: HindenburgClusterConfig;
    loadbalancer: HindenburgLoadBalancerServerConfig;
    redis: RedisServerConfig;
}
export class Node<T extends EventData = any> extends EventEmitter<T> {
    redis: ioredis.Redis;
    logger: winston.Logger;

    config: HindenburgConfig;

    constructor(label: string, config: Partial<HindenburgConfig>) {
        super();

        this.config = {
            reactor: false,
            ...config,
            anticheat: {
                versions: ["2020.4.2"],
                banMessage: "You were banned for %s for hacking.",
                maxConnectionsPerIp: 2,
                checkSettings: true,
                checkObjectOwnership: true,
                hostChecks: true,
                invalidFlow: true,
                invalidName: true,
                malformedPackets: false,
                massivePackets: {
                    penalty: "disconnect",
                    strikes: 3
                },
                ...config.anticheat
            },
            loadbalancer: {
                clusters: [
                    {
                        name: "Cluster",
                        ip: "127.0.0.1",
                        ports: [ 22123 ]
                    }
                ],
                ip: "127.0.0.1",
                port: 22023,
                ...config.loadbalancer
            },
            cluster: {
                name: "Cluster",
                ip: "127.0.0.1",
                ports: [ 22123 ],
                ...config.cluster
            },
            redis: {
                host: "127.0.0.1",
                port: 6379,
                ...config.redis
            }
        }
        
        this.logger = winston.createLogger({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.splat(),
                        winston.format.colorize(),
                        winston.format.label({ label }),
                        winston.format.printf(info => {
                            return `[${info.label}] ${info.level}: ${info.message}`;
                        }),
                    ),
                }),
                new winston.transports.File({
                    filename: "logs.txt",
                    format: winston.format.combine(
                        winston.format.splat(),
                        winston.format.simple()
                    )
                })
            ]
        });

        this.redis = new ioredis(this.config.redis);
    }
}