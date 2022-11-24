import { DocumentsService } from "udc-shared";
import { ApiService } from "./services/api-service";
import { ResourcesService } from "./services/resources-service";

export const resourcesRouter = Router();

resourcesRouter.get('/:resourceName', async (req, res, next) => {
    const apiService = new ApiService();
    const resourcesService = new ResourcesService();
    const documentsService = new DocumentsService(apiService, resourcesService);
    documentsService.find(req.params.resourceName, {}).then(item => {
        res.json(item);
    }).catch(next);
})

resourcesRouter.post('/:resourceName', async (req, res, next) => {
    const apiService = new ApiService();
    const resourcesService = new ResourcesService();
    const documentsService = new DocumentsService(apiService, resourcesService);
    
    documentsService.upsert(req.params.resourceName, req.body).then(item => {
        res.json(item);
    }).catch(next);
})

resourcesRouter.get('/:resourceName/key/:key', async (req, res, next) => {
    const apiService = new ApiService();
    const resourcesService = new ResourcesService();
    const documentsService = new DocumentsService(apiService, resourcesService);
    
    documentsService.getDocumentByKey(req.params.resourceName, req.params.key).then(scheme => {
        res.json(scheme);
    }).catch(next);
})

resourcesRouter.post('/:resourceName/search', async (req, res, next) => {
    const apiService = new ApiService();
    const resourcesService = new ResourcesService();
    const documentsService = new DocumentsService(apiService, resourcesService);

    documentsService.search(req.params.resourceName, req.body).then(scheme => {
        res.json(scheme);
    }).catch(next);
})