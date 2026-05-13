import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { TechStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { TechnologyCatalogQueryDto } from './dto/technology-catalog-query.dto';
import { TECHNOLOGY_SEED, TechnologySeed } from './technology-catalog.seed';

@Injectable()
export class TechnologyCatalogService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedCatalog();
  }

  async search(query: TechnologyCatalogQueryDto) {
    const take = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const term = query.query?.trim();
    const where: Prisma.TechnologyCatalogWhereInput = {
      status: { not: TechStatus.rejected },
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.ecosystem ? { ecosystem: query.ecosystem } : {}),
      ...(term
        ? {
            OR: [
              { slug: { contains: term, mode: 'insensitive' } },
              { canonicalName: { contains: term, mode: 'insensitive' } },
              { aliases: { some: { alias: { contains: term, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const technologies = await this.prisma.technologyCatalog.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { canonicalName: 'asc' }],
      take,
      include: {
        aliases: { orderBy: { alias: 'asc' } },
        versions: {
          orderBy: [{ isDefault: 'desc' }, { version: 'desc' }],
          take: 12,
        },
      },
    });

    return { success: true, data: technologies };
  }

  async versions(id: string) {
    const versions = await this.prisma.technologyVersion.findMany({
      where: { technologyId: id },
      orderBy: [{ isDefault: 'desc' }, { version: 'desc' }],
    });

    return { success: true, data: versions };
  }

  private async seedCatalog() {
    for (const item of TECHNOLOGY_SEED) {
      await this.upsertTechnology(item);
    }
  }

  private async upsertTechnology(item: TechnologySeed) {
    const metadataJson = item.metadata as Prisma.InputJsonValue | undefined;
    const technology = await this.prisma.technologyCatalog.upsert({
      where: { slug: item.slug },
      update: {
        canonicalName: item.canonicalName,
        kind: item.kind,
        ecosystem: item.ecosystem,
        description: item.description,
        homepageUrl: item.homepageUrl,
        repositoryUrl: item.repositoryUrl,
        license: item.license,
        latestVersion: item.latestVersion ?? item.versions?.at(-1),
        source: item.source,
        status: TechStatus.active,
        metadataJson,
      },
      create: {
        slug: item.slug,
        canonicalName: item.canonicalName,
        kind: item.kind,
        ecosystem: item.ecosystem,
        description: item.description,
        homepageUrl: item.homepageUrl,
        repositoryUrl: item.repositoryUrl,
        license: item.license,
        latestVersion: item.latestVersion ?? item.versions?.at(-1),
        source: item.source,
        status: TechStatus.active,
        metadataJson,
      },
    });

    if (item.aliases?.length) {
      await this.prisma.technologyAlias.createMany({
        data: item.aliases.map((alias) => ({
          technologyId: technology.id,
          alias: alias.toLowerCase(),
        })),
        skipDuplicates: true,
      });
    }

    if (item.versions?.length) {
      await this.prisma.technologyVersion.createMany({
        data: item.versions.map((version, index) => ({
          technologyId: technology.id,
          version,
          isDefault: index === item.versions!.length - 1,
        })),
        skipDuplicates: true,
      });
    }
  }
}
