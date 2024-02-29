import { PapiClient } from '@pepperi-addons/papi-sdk';
import { Client } from '@pepperi-addons/debug-server';
import { AddonUUID } from '../../addon.config.json'

export class PermissionsService {

    papiClient: PapiClient
    private readonly employeeType: string = "1" // Admin
    private readonly policiesUrl: string = `/policies`;
    private readonly profilesUrl: string = `/policy_profiles`;

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    async createPermission(policyName: string, policyDescription: string) {
        try {
            await this.createPolicy(policyName, policyDescription);
            await this.createProfile(policyName);
        } catch (err) {
            throw new Error(`Could not create permissions, error: ${err}`)
        }
    }

    private async createPolicy(policyName: string, policyDescription: string) {
        const body = {
            AddonUUID: AddonUUID,
            Name: policyName,
            Description: policyDescription
        }
        try {
            console.log(`Going to upsert policy with policyName - ${policyName}`);
            const result = await this.papiClient.post(this.policiesUrl, body);
            console.log(`Policy created successfully, policyName - ${policyName} got result ${result}`);
        } catch (err) {
            throw new Error(`Could not upsert policy, error: ${err}`)
        }
    }

    private async createProfile(policyName: string) {
        const body = {
            PolicyAddonUUID: AddonUUID,
            PolicyName: policyName,
            ProfileID: this.employeeType,
            Allowed: true
        }
        try {
            console.log(`Going to upsert profile with policyName - ${policyName}`);
            const result = await this.papiClient.post(this.profilesUrl, body);
            console.log(`Profile created successfully, policyName - ${policyName}, got result ${result}`);
        } catch (err) {
            throw new Error(`Could not upsert profile, error: ${err}`)
        }
    }
}

